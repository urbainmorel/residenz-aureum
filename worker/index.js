import { createD1AbuseStore } from "../server/adapters/d1-abuse-store.js";
import {
  createDisabledMailGateway,
  createResendMailGateway,
} from "../server/adapters/resend-mail-gateway.js";
import {
  ContactServiceError,
  createContactService,
} from "../server/contact/service.js";
import {
  addCorsHeaders,
  applySecurityHeaders,
  clientIp,
  validateRequestOrigin,
} from "../server/contact/security.js";
import {
  ContactBodyError,
  ContactValidationError,
  readJsonBody,
  validateContactPayload,
} from "../server/contact/validation.js";
import { loadContactRuntimeConfig } from "../server/runtime/config.js";

const jsonContentTypePattern =
  /^application\/json(?:\s*;\s*charset=(?:"?utf-8"?))?\s*$/iu;

function responseHeaders(origin = null) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  applySecurityHeaders(headers);
  addCorsHeaders(headers, origin);
  return headers;
}

function jsonResponse(body, status, origin = null, extraHeaders = {}) {
  const headers = responseHeaders(origin);
  for (const [name, value] of Object.entries(extraHeaders)) {
    headers.set(name, value);
  }
  return new Response(JSON.stringify(body), { headers, status });
}

function errorResponse(code, origin = null, fields = null) {
  const statusByCode = {
    BAD_REQUEST: 400,
    EMAIL_UNAVAILABLE: 503,
    RATE_LIMITED: 429,
    VALIDATION_ERROR: 422,
  };
  const body = { code, ok: false };
  if (code === "VALIDATION_ERROR") {
    body.fields = fields ?? {};
  }
  return jsonResponse(body, statusByCode[code] ?? 503, origin);
}

function safeLogger() {
  return {
    error(event, fields) {
      console.error(event, fields);
    },
    info(event, fields) {
      console.info(event, fields);
    },
  };
}

function createGateway(config) {
  return config.transportMode === "resend"
    ? createResendMailGateway({ apiKey: config.resendApiKey })
    : createDisabledMailGateway();
}

export async function handleContactRequest(
  request,
  { config, context, logger = safeLogger(), mailGateway, store },
) {
  if (!["OPTIONS", "POST"].includes(request.method)) {
    return jsonResponse({ code: "METHOD_NOT_ALLOWED", ok: false }, 405, null, {
      Allow: "POST, OPTIONS",
    });
  }

  const originCheck = validateRequestOrigin(request, config.allowedOrigins);
  if (!originCheck.allowed) {
    return errorResponse("BAD_REQUEST");
  }
  const origin = originCheck.origin;

  if (request.method === "OPTIONS") {
    const requestedMethod = request.headers.get(
      "access-control-request-method",
    );
    const requestedHeaders = (
      request.headers.get("access-control-request-headers") ?? ""
    )
      .split(",")
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean);
    if (
      requestedMethod !== "POST" ||
      requestedHeaders.some((header) => header !== "content-type")
    ) {
      return errorResponse("BAD_REQUEST", origin);
    }
    const headers = responseHeaders(origin);
    headers.delete("Content-Type");
    headers.set("Access-Control-Allow-Headers", "content-type");
    headers.set("Access-Control-Allow-Methods", "POST");
    headers.set("Access-Control-Max-Age", "600");
    return new Response(null, { headers, status: 204 });
  }

  const contentEncoding = (
    request.headers.get("content-encoding") ?? "identity"
  ).toLowerCase();
  if (
    contentEncoding !== "identity" ||
    !jsonContentTypePattern.test(request.headers.get("content-type") ?? "")
  ) {
    return errorResponse("BAD_REQUEST", origin);
  }

  let payload;
  try {
    payload = await readJsonBody(request);
  } catch (error) {
    if (error instanceof ContactBodyError) {
      return errorResponse("BAD_REQUEST", origin);
    }
    return errorResponse("BAD_REQUEST", origin);
  }

  let contact;
  try {
    contact = validateContactPayload(payload);
  } catch (error) {
    if (error instanceof ContactBodyError) {
      return errorResponse("BAD_REQUEST", origin);
    }
    if (error instanceof ContactValidationError) {
      return errorResponse("VALIDATION_ERROR", origin, error.fields);
    }
    return errorResponse("BAD_REQUEST", origin);
  }

  try {
    const service = createContactService({
      abuseStore: store,
      config,
      logger,
      mailGateway,
    });
    const result = await service.submit(contact, { ip: clientIp(request) });
    return jsonResponse({ ok: result.accepted === true }, 202, origin);
  } catch (error) {
    if (error instanceof ContactServiceError) {
      return errorResponse(error.code, origin);
    }
    console.error("contact_unexpected_failure", {
      submissionId: contact.submissionId,
    });
    return errorResponse("EMAIL_UNAVAILABLE", origin);
  } finally {
    context?.waitUntil?.(store.purgeExpired(Date.now()).catch(() => undefined));
  }
}

async function withAssetSecurityHeaders(response) {
  const headers = new Headers(response.headers);
  applySecurityHeaders(headers);
  return new Response(response.body, {
    headers,
    status: response.status,
    statusText: response.statusText,
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      try {
        const config = loadContactRuntimeConfig(env);
        return handleContactRequest(request, {
          config,
          context,
          mailGateway: createGateway(config),
          store: createD1AbuseStore(env.DB),
        });
      } catch {
        return errorResponse("EMAIL_UNAVAILABLE");
      }
    }
    if (url.pathname.startsWith("/api/")) {
      return jsonResponse({ code: "NOT_FOUND", ok: false }, 404);
    }
    return withAssetSecurityHeaders(await env.ASSETS.fetch(request));
  },
};

const encoder = new TextEncoder();

export const SECURITY_HEADERS = Object.freeze({
  "Content-Security-Policy":
    "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self'",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Strict-Transport-Security": "max-age=31536000",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
});

export function parseAllowedOrigins(value) {
  const origins = new Set();
  for (const entry of String(value ?? "").split(",")) {
    const candidate = entry.trim();
    if (!candidate) {
      continue;
    }
    let url;
    try {
      url = new URL(candidate);
    } catch {
      throw new Error("CONTACT_ALLOWED_ORIGINS_INVALID");
    }
    if (
      !["http:", "https:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error("CONTACT_ALLOWED_ORIGINS_INVALID");
    }
    origins.add(url.origin);
  }
  if (origins.size === 0) {
    throw new Error("CONTACT_ALLOWED_ORIGINS_REQUIRED");
  }
  return origins;
}

export function validateRequestOrigin(request, allowedOrigins) {
  const origin = request.headers.get("origin");
  if (!origin || !allowedOrigins.has(origin)) {
    return { allowed: false, origin: null };
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin") {
    return { allowed: false, origin: null };
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      if (new URL(referer).origin !== origin) {
        return { allowed: false, origin: null };
      }
    } catch {
      return { allowed: false, origin: null };
    }
  }

  return { allowed: true, origin };
}

export function applySecurityHeaders(headers) {
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    headers.set(name, value);
  }
}

export function addCorsHeaders(headers, origin) {
  if (!origin) {
    return;
  }
  headers.set("Access-Control-Allow-Origin", origin);
  headers.append("Vary", "Origin");
}

export function clientIp(request) {
  const value = request.headers.get("cf-connecting-ip");
  return value && value.length <= 64 ? value : "unknown";
}

function hex(bytes) {
  return [...new Uint8Array(bytes)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createRateLimitFingerprint({
  email,
  ip,
  secret,
  subtle = globalThis.crypto.subtle,
}) {
  const key = await subtle.importKey(
    "raw",
    encoder.encode(secret),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"],
  );
  const signature = await subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${ip}\n${email}`),
  );
  return hex(signature);
}

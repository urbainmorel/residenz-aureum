import { parseAllowedOrigins } from "../contact/security.js";

const placeholderPattern =
  /(?:example(?:_only)?|replace-with|do-not-use|\.invalid|000000)/iu;
const phonePattern = /^\+[1-9][0-9]{6,14}$/u;
const approvalPathPattern =
  /^\/urbainmorel\/residenz-aureum\/(?:issues|pull)\/[1-9][0-9]*$/u;

function containsControl(value) {
  return [...value].some((character) => {
    const code = character.codePointAt(0);
    return code <= 31 || code === 127;
  });
}

function requiredString(env, name) {
  const value = String(env[name] ?? "").trim();
  if (!value) {
    throw new Error(`CONTACT_CONFIG_${name}_REQUIRED`);
  }
  return value;
}

export function normalizeApprovalRef(value) {
  const raw = String(value ?? "").trim();
  if (!raw || containsControl(raw) || placeholderPattern.test(raw)) {
    throw new Error("CONTACT_CONFIG_APPROVAL_REF_INVALID");
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("CONTACT_CONFIG_APPROVAL_REF_INVALID");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "github.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    !approvalPathPattern.test(url.pathname) ||
    placeholderPattern.test(url.href)
  ) {
    throw new Error("CONTACT_CONFIG_APPROVAL_REF_INVALID");
  }
  return url.href;
}

function mailboxAddress(value, { allowDisplayName = false } = {}) {
  const raw = String(value ?? "").trim();
  if (!raw || containsControl(raw)) {
    return null;
  }

  let address = raw;
  const displayMatch = raw.match(/^([^<>\r\n]{1,100})\s+<([^<>]+)>$/u);
  if (displayMatch) {
    if (!allowDisplayName) {
      return null;
    }
    address = displayMatch[2].trim();
  } else if (raw.includes("<") || raw.includes(">")) {
    return null;
  }

  if (address.length > 254 || address !== address.trim()) {
    return null;
  }
  const at = address.lastIndexOf("@");
  if (at <= 0 || at !== address.indexOf("@")) {
    return null;
  }
  const local = address.slice(0, at);
  const domain = address.slice(at + 1).toLowerCase();
  if (
    local.length > 64 ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..") ||
    !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(local) ||
    domain.length > 253 ||
    domain.includes("%") ||
    domain.includes("..") ||
    placeholderPattern.test(domain)
  ) {
    return null;
  }
  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    labels.some(
      (label) =>
        label.length > 63 ||
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/u.test(label),
    ) ||
    !/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/u.test(labels.at(-1))
  ) {
    return null;
  }
  return `${local}@${domain}`;
}

export function loadContactRuntimeConfig(env) {
  const runtimeMode = String(env.CONTACT_RUNTIME_MODE ?? "preview").trim();
  const transportMode = String(env.CONTACT_TRANSPORT_MODE ?? "disabled").trim();
  if (!["preview", "production"].includes(runtimeMode)) {
    throw new Error("CONTACT_CONFIG_RUNTIME_MODE_INVALID");
  }
  if (!["disabled", "resend"].includes(transportMode)) {
    throw new Error("CONTACT_CONFIG_TRANSPORT_MODE_INVALID");
  }

  const rateLimitSecret = requiredString(env, "CONTACT_RATE_LIMIT_SECRET");
  if (rateLimitSecret.length < 32 || placeholderPattern.test(rateLimitSecret)) {
    throw new Error("CONTACT_CONFIG_RATE_LIMIT_SECRET_INVALID");
  }

  const publicSiteUrl = requiredString(env, "PUBLIC_SITE_URL");
  let siteUrl;
  try {
    siteUrl = new URL(publicSiteUrl);
  } catch {
    throw new Error("CONTACT_CONFIG_PUBLIC_SITE_URL_INVALID");
  }
  if (
    !["http:", "https:"].includes(siteUrl.protocol) ||
    siteUrl.username ||
    siteUrl.password ||
    siteUrl.pathname !== "/" ||
    siteUrl.search ||
    siteUrl.hash
  ) {
    throw new Error("CONTACT_CONFIG_PUBLIC_SITE_URL_INVALID");
  }

  const allowedOrigins = parseAllowedOrigins(
    requiredString(env, "CONTACT_ALLOWED_ORIGINS"),
  );
  const from = String(env.RESEND_FROM_EMAIL ?? "").trim();
  const to = String(env.RESEND_CONTACT_TO ?? "").trim();
  const fallbackPhone = String(env.CONTACT_FALLBACK_PHONE ?? "").trim();
  const apiKey = String(env.RESEND_API_KEY ?? "").trim();
  const resendDomainApprovalRef = String(
    env.RESEND_DOMAIN_APPROVAL_REF ?? "",
  ).trim();
  let normalizedResendDomainApprovalRef = resendDomainApprovalRef;

  if (/[\r\n]/u.test(from) || /[\r\n]/u.test(to)) {
    throw new Error("CONTACT_CONFIG_EMAIL_HEADER_INVALID");
  }
  if (transportMode === "resend") {
    if (
      !apiKey.startsWith("re_") ||
      !mailboxAddress(from, { allowDisplayName: true }) ||
      !mailboxAddress(to) ||
      !phonePattern.test(fallbackPhone)
    ) {
      throw new Error("CONTACT_CONFIG_EMAIL_INVALID");
    }
  }

  if (runtimeMode === "production") {
    if (transportMode !== "resend") {
      throw new Error("CONTACT_CONFIG_PRODUCTION_TRANSPORT_REQUIRED");
    }
    const productionValues = [
      apiKey,
      from,
      to,
      fallbackPhone,
      publicSiteUrl,
      resendDomainApprovalRef,
    ];
    if (
      productionValues.some((value) => !value || placeholderPattern.test(value))
    ) {
      throw new Error("CONTACT_CONFIG_PRODUCTION_PLACEHOLDER");
    }
    try {
      normalizedResendDomainApprovalRef = normalizeApprovalRef(
        resendDomainApprovalRef,
      );
    } catch {
      throw new Error("CONTACT_CONFIG_PRODUCTION_RESEND_UNVERIFIED");
    }
    if (
      env.RESEND_DOMAIN_VERIFIED !== "true" ||
      env.RESEND_SPF_VERIFIED !== "true" ||
      env.RESEND_DKIM_VERIFIED !== "true" ||
      !normalizedResendDomainApprovalRef
    ) {
      throw new Error("CONTACT_CONFIG_PRODUCTION_RESEND_UNVERIFIED");
    }
    if (
      siteUrl.protocol !== "https:" ||
      !allowedOrigins.has(siteUrl.origin) ||
      [...allowedOrigins].some(
        (origin) =>
          new URL(origin).protocol !== "https:" ||
          placeholderPattern.test(origin),
      )
    ) {
      throw new Error("CONTACT_CONFIG_PRODUCTION_ORIGIN_INVALID");
    }
  }

  return Object.freeze({
    allowedOrigins,
    fallbackPhone,
    from,
    publicSiteUrl: siteUrl.origin,
    rateLimitSecret,
    resendApiKey: apiKey,
    resendDomainApprovalRef: normalizedResendDomainApprovalRef,
    runtimeMode,
    to,
    transportMode,
  });
}

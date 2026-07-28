export const CONTACT_BODY_LIMIT_BYTES = 32 * 1024;

export const CONTACT_PAYLOAD_KEYS = Object.freeze([
  "submissionId",
  "locale",
  "intent",
  "firstName",
  "lastName",
  "email",
  "phone",
  "preferredContact",
  "preferredDate",
  "message",
  "privacyAccepted",
  "company",
  "formStartedAt",
]);

const contactPayloadKeySet = new Set(CONTACT_PAYLOAD_KEYS);
const uuidV4Pattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;
const phonePattern = /^[+0-9() ./-]{6,30}$/u;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

export class ContactBodyError extends Error {
  constructor(code = "BAD_REQUEST") {
    super(code);
    this.name = "ContactBodyError";
    this.code = code;
  }
}

export class ContactValidationError extends Error {
  constructor(fields) {
    super("VALIDATION_ERROR");
    this.name = "ContactValidationError";
    this.fields = fields;
  }
}

function codePointLength(value) {
  return [...value].length;
}

function normalizeSingleLine(value) {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

function normalizeMessage(value) {
  return value
    .normalize("NFC")
    .replace(/\r\n?/gu, "\n")
    .replace(/[^\S\n]+/gu, " ")
    .replace(/ *\n */gu, "\n")
    .trim();
}

function hasForbiddenControl(value) {
  return [...value].some((character) => {
    const codePoint = character.codePointAt(0);
    return (
      codePoint <= 8 ||
      codePoint === 11 ||
      codePoint === 12 ||
      (codePoint >= 14 && codePoint <= 31) ||
      codePoint === 127
    );
  });
}

function readString(payload, field, errors, options = {}) {
  const {
    allowLineBreaks = false,
    max,
    min = 0,
    normalize = normalizeSingleLine,
    optional = false,
  } = options;
  const raw = payload[field];

  if (typeof raw !== "string") {
    errors[field] = optional && raw === undefined ? "optional" : "invalid";
    return "";
  }

  if (hasForbiddenControl(raw) || (!allowLineBreaks && /[\r\n]/u.test(raw))) {
    errors[field] = "invalid";
    return "";
  }

  const value = normalize(raw);
  const length = codePointLength(value);
  if ((!optional && length < min) || (optional && value && length < min)) {
    errors[field] = "too_short";
  } else if (length > max) {
    errors[field] = "too_long";
  }

  return value;
}

function isRealIsoDate(value) {
  if (!isoDatePattern.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.valueOf()) && parsed.toISOString().startsWith(value)
  );
}

export async function readJsonBody(
  request,
  { limitBytes = CONTACT_BODY_LIMIT_BYTES } = {},
) {
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength &&
    (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > limitBytes)
  ) {
    throw new ContactBodyError("PAYLOAD_TOO_LARGE");
  }

  if (!request.body) {
    throw new ContactBodyError();
  }

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      total += value.byteLength;
      if (total > limitBytes) {
        await reader.cancel();
        throw new ContactBodyError("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new ContactBodyError();
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new ContactBodyError();
  }
}

export function validateContactPayload(payload, { nowMs = Date.now() } = {}) {
  if (
    !payload ||
    typeof payload !== "object" ||
    Array.isArray(payload) ||
    Object.getPrototypeOf(payload) !== Object.prototype
  ) {
    throw new ContactBodyError();
  }

  const keys = Object.keys(payload);
  if (
    keys.some((key) => !contactPayloadKeySet.has(key)) ||
    CONTACT_PAYLOAD_KEYS.some((key) => !Object.hasOwn(payload, key))
  ) {
    throw new ContactBodyError();
  }

  const errors = {};
  const submissionId = readString(payload, "submissionId", errors, {
    max: 36,
    min: 36,
  }).toLowerCase();
  const firstName = readString(payload, "firstName", errors, {
    max: 80,
    min: 1,
  });
  const lastName = readString(payload, "lastName", errors, {
    max: 80,
    min: 1,
  });
  const email = readString(payload, "email", errors, {
    max: 254,
    min: 3,
  }).toLowerCase();
  const phone = readString(payload, "phone", errors, {
    max: 30,
    optional: true,
  });
  const preferredDate = readString(payload, "preferredDate", errors, {
    max: 10,
    optional: true,
  });
  const message = readString(payload, "message", errors, {
    allowLineBreaks: true,
    max: 3000,
    min: 20,
    normalize: normalizeMessage,
  });
  const company = readString(payload, "company", errors, {
    max: 200,
    optional: true,
  });

  if (!uuidV4Pattern.test(submissionId)) {
    errors.submissionId = "invalid";
  }
  if (!["de", "fr"].includes(payload.locale)) {
    errors.locale = "invalid";
  }
  if (!["general", "visit"].includes(payload.intent)) {
    errors.intent = "invalid";
  }
  if (!emailPattern.test(email)) {
    errors.email = "invalid";
  }
  if (phone && !phonePattern.test(phone)) {
    errors.phone = "invalid";
  }
  if (!["email", "phone", "none"].includes(payload.preferredContact)) {
    errors.preferredContact = "invalid";
  } else if (payload.preferredContact === "phone" && !phone) {
    errors.phone = "required";
  }
  if (
    preferredDate &&
    (!isRealIsoDate(preferredDate) ||
      preferredDate <= new Date(nowMs).toISOString().slice(0, 10))
  ) {
    errors.preferredDate = "invalid";
  }
  if (payload.privacyAccepted !== true) {
    errors.privacyAccepted = "required";
  }
  const formStartedAt =
    typeof payload.formStartedAt === "string" &&
    /^\d{1,16}$/u.test(payload.formStartedAt)
      ? Number(payload.formStartedAt)
      : payload.formStartedAt;
  if (
    !Number.isSafeInteger(formStartedAt) ||
    formStartedAt <= 0 ||
    formStartedAt > nowMs + 5 * 60 * 1000 ||
    formStartedAt < nowMs - 7 * 24 * 60 * 60 * 1000
  ) {
    errors.formStartedAt = "invalid";
  }

  if (Object.keys(errors).length > 0) {
    throw new ContactValidationError(errors);
  }

  return Object.freeze({
    company,
    email,
    firstName,
    formStartedAt,
    intent: payload.intent,
    lastName,
    locale: payload.locale,
    message,
    phone,
    preferredContact: payload.preferredContact,
    preferredDate,
    privacyAccepted: true,
    submissionId,
  });
}

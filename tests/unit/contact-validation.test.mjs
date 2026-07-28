import assert from "node:assert/strict";
import test from "node:test";
import {
  ContactBodyError,
  ContactValidationError,
  readJsonBody,
  validateContactPayload,
} from "../../server/contact/validation.js";

const nowMs = Date.parse("2026-07-28T12:00:00.000Z");

function validPayload(overrides = {}) {
  return {
    company: "",
    email: "anna@example.com",
    firstName: " Anna ",
    formStartedAt: String(nowMs - 10_000),
    intent: "visit",
    lastName: "Beispiel",
    locale: "de",
    message: "Ich möchte einen Besichtigungstermin vereinbaren.",
    phone: "+49 208 123 45",
    preferredContact: "email",
    preferredDate: "2026-09-15",
    privacyAccepted: true,
    submissionId: "123e4567-e89b-42d3-a456-426614174000",
    ...overrides,
  };
}

test("normalise le payload réel du navigateur avec timestamp décimal", () => {
  const contact = validateContactPayload(validPayload(), { nowMs });
  assert.equal(contact.firstName, "Anna");
  assert.equal(contact.email, "anna@example.com");
  assert.equal(contact.formStartedAt, nowMs - 10_000);
});

test("rejette clés inconnues, UUID non v4 et injections CRLF", () => {
  assert.throws(
    () =>
      validateContactPayload({ ...validPayload(), role: "admin" }, { nowMs }),
    ContactBodyError,
  );
  assert.throws(
    () =>
      validateContactPayload(
        validPayload({
          firstName: "Anna\r\nBcc: victime@example.com",
          submissionId: "123e4567-e89b-12d3-a456-426614174000",
        }),
        { nowMs },
      ),
    (error) =>
      error instanceof ContactValidationError &&
      error.fields.firstName === "invalid" &&
      error.fields.submissionId === "invalid",
  );
});

test("refuse la date du jour ou passée et exige un téléphone si choisi", () => {
  assert.throws(
    () =>
      validateContactPayload(
        validPayload({
          phone: "",
          preferredContact: "phone",
          preferredDate: "2026-07-28",
        }),
        { nowMs },
      ),
    (error) =>
      error instanceof ContactValidationError &&
      error.fields.phone === "required" &&
      error.fields.preferredDate === "invalid",
  );
});

test("limite aussi les octets réels du flux à 32 Kio", async () => {
  const request = new Request("https://example.test/api/contact", {
    body: JSON.stringify({ message: "é".repeat(20_000) }),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  await assert.rejects(() => readJsonBody(request), ContactBodyError);
});

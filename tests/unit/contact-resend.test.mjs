import assert from "node:assert/strict";
import test from "node:test";
import {
  MailDeliveryError,
  createResendMailGateway,
} from "../../server/adapters/resend-mail-gateway.js";

const message = {
  from: "Aureum <contact@example.test>",
  html: "<p>Test</p>",
  subject: "Test",
  text: "Test",
  to: "anna@example.test",
};

test("transmet une clé Resend stable distincte du message", async () => {
  const calls = [];
  const gateway = createResendMailGateway({
    resendClient: {
      emails: {
        async send(...args) {
          calls.push(args);
          return { data: { id: "email-id" }, error: null };
        },
      },
    },
  });

  await gateway.sendInternal(message, {
    idempotencyKey: "contact-internal/123e4567-e89b-42d3-a456-426614174000",
  });
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0][1].idempotencyKey,
    "contact-internal/123e4567-e89b-42d3-a456-426614174000",
  );
});

test("distingue refus fournisseur et résultat réseau ambigu", async () => {
  const refused = createResendMailGateway({
    resendClient: {
      emails: {
        async send() {
          return { data: null, error: { name: "validation_error" } };
        },
      },
    },
  });
  await assert.rejects(
    () => refused.sendInternal(message, { idempotencyKey: "refused" }),
    (error) => error instanceof MailDeliveryError && !error.ambiguous,
  );

  const timedOut = createResendMailGateway({
    resendClient: {
      emails: { send: () => new Promise(() => undefined) },
    },
    timeoutMs: 5,
  });
  await assert.rejects(
    () => timedOut.sendInternal(message, { idempotencyKey: "timeout" }),
    (error) => error instanceof MailDeliveryError && error.ambiguous,
  );
});

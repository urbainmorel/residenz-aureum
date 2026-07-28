import { buildConfirmationEmail, buildInternalEmail } from "./email.js";
import { createRateLimitFingerprint } from "./security.js";

export class ContactServiceError extends Error {
  constructor(code) {
    super(code);
    this.name = "ContactServiceError";
    this.code = code;
  }
}

async function hmacPayload(contact, secret, subtle = globalThis.crypto.subtle) {
  const canonical = JSON.stringify(
    Object.fromEntries(
      Object.entries(contact)
        .filter(([key]) => key !== "company")
        .sort(([left], [right]) => left.localeCompare(right)),
    ),
  );
  return createRateLimitFingerprint({
    email: canonical,
    ip: "payload",
    secret,
    subtle,
  });
}

export function createContactService({
  abuseStore,
  clock = { now: () => new Date() },
  config,
  logger = { error() {}, info() {} },
  mailGateway,
  subtle = globalThis.crypto.subtle,
  uuid = () => globalThis.crypto.randomUUID(),
}) {
  return {
    async submit(contact, { ip }) {
      if (contact.company) {
        return { accepted: true, spam: true };
      }

      const now = clock.now();
      const nowMs = now.valueOf();
      const leaseToken = uuid();
      const payloadFingerprint = await hmacPayload(
        contact,
        config.rateLimitSecret,
        subtle,
      );
      const claim = await abuseStore.claimSubmission({
        leaseToken,
        nowMs,
        payloadFingerprint,
        submissionId: contact.submissionId,
      });

      if (claim.conflict) {
        throw new ContactServiceError("BAD_REQUEST");
      }
      if (claim.complete) {
        return { accepted: true, duplicate: true };
      }
      if (claim.busy) {
        throw new ContactServiceError("EMAIL_UNAVAILABLE");
      }
      if (claim.manualReconciliation) {
        throw new ContactServiceError("EMAIL_UNAVAILABLE");
      }

      const rateFingerprint = await createRateLimitFingerprint({
        email: contact.email,
        ip,
        secret: config.rateLimitSecret,
        subtle,
      });
      const rate = await abuseStore.consumeRateLimit({
        eventId: uuid(),
        fingerprint: rateFingerprint,
        nowMs,
      });
      if (!rate.allowed) {
        if (claim.isNew) {
          await abuseStore.removeClaim({
            leaseToken,
            submissionId: contact.submissionId,
          });
        } else {
          await abuseStore.releaseLease({
            leaseToken,
            nowMs,
            submissionId: contact.submissionId,
          });
        }
        throw new ContactServiceError("RATE_LIMITED");
      }

      const deliver = async (delivery, send, message) => {
        await abuseStore.markDelivery({
          delivery,
          leaseToken,
          nowMs: clock.now().valueOf(),
          status: "sending",
          submissionId: contact.submissionId,
        });
        try {
          await send(message, {
            idempotencyKey:
              delivery === "internal"
                ? `contact-internal/${contact.submissionId}`
                : `contact-confirmation/${contact.submissionId}`,
          });
        } catch (error) {
          await abuseStore.markDelivery({
            delivery,
            leaseToken,
            nowMs: clock.now().valueOf(),
            status: error?.ambiguous ? "ambiguous" : "failed",
            submissionId: contact.submissionId,
          });
          logger.error("contact_delivery_failed", {
            ambiguous: Boolean(error?.ambiguous),
            delivery,
            submissionId: contact.submissionId,
          });
          throw new ContactServiceError("EMAIL_UNAVAILABLE");
        }
        try {
          await abuseStore.markDelivery({
            delivery,
            leaseToken,
            nowMs: clock.now().valueOf(),
            status: "sent",
            submissionId: contact.submissionId,
          });
        } catch {
          logger.error("contact_delivery_state_unavailable", {
            delivery,
            submissionId: contact.submissionId,
          });
          throw new ContactServiceError("EMAIL_UNAVAILABLE");
        }
      };

      try {
        if (claim.internalStatus !== "sent") {
          await deliver(
            "internal",
            mailGateway.sendInternal,
            buildInternalEmail(contact, {
              from: config.from,
              receivedAt: now.toISOString(),
              to: config.to,
            }),
          );
        }
        if (claim.confirmationStatus !== "sent") {
          await deliver(
            "confirmation",
            mailGateway.sendConfirmation,
            buildConfirmationEmail(contact, {
              fallbackPhone: config.fallbackPhone,
              from: config.from,
              siteUrl: config.publicSiteUrl,
            }),
          );
        }
        logger.info("contact_delivery_completed", {
          submissionId: contact.submissionId,
        });
        return { accepted: true };
      } finally {
        await abuseStore.releaseLease({
          leaseToken,
          nowMs: clock.now().valueOf(),
          submissionId: contact.submissionId,
        });
      }
    },
  };
}

import { Resend } from "resend";

export const RESEND_TIMEOUT_MS = 15_000;

export class MailDeliveryError extends Error {
  constructor({ ambiguous = false } = {}) {
    super("MAIL_DELIVERY_FAILED");
    this.name = "MailDeliveryError";
    this.ambiguous = ambiguous;
  }
}

export function createDisabledMailGateway() {
  const unavailable = async () => {
    throw new MailDeliveryError({ ambiguous: false });
  };
  return {
    sendConfirmation: unavailable,
    sendInternal: unavailable,
  };
}

export function createResendMailGateway({
  apiKey,
  resendClient,
  timeoutMs = RESEND_TIMEOUT_MS,
} = {}) {
  const resend = resendClient ?? new Resend(apiKey);

  async function send(message, idempotencyKey) {
    let timeout;
    try {
      const result = await Promise.race([
        resend.emails.send(message, { idempotencyKey }),
        new Promise((resolve, reject) => {
          timeout = setTimeout(
            () => reject(new MailDeliveryError({ ambiguous: true })),
            timeoutMs,
          );
        }),
      ]);
      if (result.error || !result.data?.id) {
        throw new MailDeliveryError({ ambiguous: false });
      }
      return { accepted: true };
    } catch (error) {
      if (error instanceof MailDeliveryError) {
        throw error;
      }
      throw new MailDeliveryError({ ambiguous: true });
    } finally {
      clearTimeout(timeout);
    }
  }

  return {
    sendConfirmation(message, { idempotencyKey }) {
      return send(message, idempotencyKey);
    },
    sendInternal(message, { idempotencyKey }) {
      return send(message, idempotencyKey);
    },
  };
}

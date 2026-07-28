const RATE_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT = 5;
export const CONTACT_LEASE_MS = 60 * 1000;
const RESEND_IDEMPOTENCY_MS = 24 * 60 * 60 * 1000;
const SUBMISSION_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

function rowResult(result) {
  return result?.results?.[0] ?? null;
}

function isComplete(row) {
  return row.internal_status === "sent" && row.confirmation_status === "sent";
}

function isStaleAmbiguous(row, nowMs) {
  return ["internal", "confirmation"].some((delivery) => {
    const status = row[`${delivery}_status`];
    const attemptedAt = row[`${delivery}_attempted_at`];
    return (
      ["ambiguous", "sending"].includes(status) &&
      attemptedAt &&
      nowMs - attemptedAt >= RESEND_IDEMPOTENCY_MS
    );
  });
}

export function createD1AbuseStore(database) {
  if (!database?.prepare) {
    throw new Error("CONTACT_DB_BINDING_REQUIRED");
  }

  async function getSubmission(submissionId) {
    return database
      .prepare(
        `SELECT submission_id, payload_fingerprint, internal_status,
                confirmation_status, internal_attempted_at,
                confirmation_attempted_at, lease_token, lease_expires_at
           FROM contact_submissions
          WHERE submission_id = ?1`,
      )
      .bind(submissionId)
      .first();
  }

  return {
    async claimSubmission({
      leaseToken,
      nowMs,
      payloadFingerprint,
      submissionId,
    }) {
      const inserted = await database
        .prepare(
          `INSERT INTO contact_submissions (
             submission_id, payload_fingerprint, internal_status,
             confirmation_status, created_at, updated_at,
             lease_token, lease_expires_at
           ) VALUES (?1, ?2, 'pending', 'pending', ?3, ?3, ?4, ?5)
           ON CONFLICT(submission_id) DO NOTHING`,
        )
        .bind(
          submissionId,
          payloadFingerprint,
          nowMs,
          leaseToken,
          nowMs + CONTACT_LEASE_MS,
        )
        .run();

      if ((inserted.meta?.changes ?? 0) === 1) {
        return {
          claimed: true,
          confirmationStatus: "pending",
          internalStatus: "pending",
          isNew: true,
        };
      }

      const existing = await getSubmission(submissionId);
      if (!existing || existing.payload_fingerprint !== payloadFingerprint) {
        return { conflict: true };
      }
      if (isComplete(existing)) {
        return { complete: true };
      }
      if (isStaleAmbiguous(existing, nowMs)) {
        return { manualReconciliation: true };
      }
      if (existing.lease_token && Number(existing.lease_expires_at) > nowMs) {
        return { busy: true };
      }

      const claimed = await database
        .prepare(
          `UPDATE contact_submissions
              SET lease_token = ?2, lease_expires_at = ?3, updated_at = ?4
            WHERE submission_id = ?1
              AND payload_fingerprint = ?5
              AND (lease_token IS NULL OR lease_expires_at <= ?4)
              AND NOT (
                internal_status = 'sent'
                AND confirmation_status = 'sent'
              )
          RETURNING internal_status, confirmation_status`,
        )
        .bind(
          submissionId,
          leaseToken,
          nowMs + CONTACT_LEASE_MS,
          nowMs,
          payloadFingerprint,
        )
        .all();
      const row = rowResult(claimed);
      if (!row) {
        return { busy: true };
      }
      return {
        claimed: true,
        confirmationStatus: row.confirmation_status,
        internalStatus: row.internal_status,
        isNew: false,
      };
    },

    async consumeRateLimit({ eventId, fingerprint, nowMs }) {
      const result = await database
        .prepare(
          `INSERT INTO contact_rate_limit_events (
             event_id, fingerprint, occurred_at, expires_at
           )
           SELECT ?1, ?2, ?3, ?4
            WHERE (
              SELECT COUNT(*)
                FROM contact_rate_limit_events
               WHERE fingerprint = ?2 AND occurred_at > ?5
            ) < ?6
          RETURNING event_id`,
        )
        .bind(
          eventId,
          fingerprint,
          nowMs,
          nowMs + RATE_WINDOW_MS,
          nowMs - RATE_WINDOW_MS,
          RATE_LIMIT,
        )
        .all();
      return { allowed: Boolean(rowResult(result)?.event_id) };
    },

    async markDelivery({ delivery, leaseToken, nowMs, status, submissionId }) {
      if (!["internal", "confirmation"].includes(delivery)) {
        throw new Error("CONTACT_DELIVERY_INVALID");
      }
      if (!["ambiguous", "failed", "sending", "sent"].includes(status)) {
        throw new Error("CONTACT_DELIVERY_STATUS_INVALID");
      }
      const statusColumn = `${delivery}_status`;
      const attemptedColumn = `${delivery}_attempted_at`;
      const attemptedValue = status === "sending" ? nowMs : null;
      const statement =
        attemptedValue === null
          ? `UPDATE contact_submissions
                SET ${statusColumn} = ?3, updated_at = ?4
              WHERE submission_id = ?1 AND lease_token = ?2`
          : `UPDATE contact_submissions
                SET ${statusColumn} = ?3, ${attemptedColumn} = ?4,
                    updated_at = ?4
              WHERE submission_id = ?1 AND lease_token = ?2`;
      const result = await database
        .prepare(statement)
        .bind(submissionId, leaseToken, status, nowMs)
        .run();
      if ((result.meta?.changes ?? 0) !== 1) {
        throw new Error("CONTACT_LEASE_LOST");
      }
    },

    async purgeExpired(nowMs) {
      await database.batch([
        database
          .prepare(
            `DELETE FROM contact_rate_limit_events
              WHERE event_id IN (
                SELECT event_id FROM contact_rate_limit_events
                 WHERE expires_at < ?1 LIMIT 100
              )`,
          )
          .bind(nowMs),
        database
          .prepare(
            `DELETE FROM contact_submissions
              WHERE submission_id IN (
                SELECT submission_id FROM contact_submissions
                 WHERE created_at < ?1 AND lease_token IS NULL LIMIT 100
              )`,
          )
          .bind(nowMs - SUBMISSION_RETENTION_MS),
      ]);
    },

    async releaseLease({ leaseToken, nowMs, submissionId }) {
      await database
        .prepare(
          `UPDATE contact_submissions
              SET lease_token = NULL, lease_expires_at = NULL, updated_at = ?3
            WHERE submission_id = ?1 AND lease_token = ?2`,
        )
        .bind(submissionId, leaseToken, nowMs)
        .run();
    },

    async removeClaim({ leaseToken, submissionId }) {
      await database
        .prepare(
          `DELETE FROM contact_submissions
            WHERE submission_id = ?1 AND lease_token = ?2
              AND internal_status = 'pending'
              AND confirmation_status = 'pending'`,
        )
        .bind(submissionId, leaseToken)
        .run();
    },
  };
}

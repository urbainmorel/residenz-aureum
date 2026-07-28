-- No contact PII is stored. Fingerprints are HMAC-SHA256 values computed
-- server-side. Completed submission state is retained for at most 90 days by
-- the Worker cleanup path so Resend's 24-hour idempotency window is not the
-- only duplicate-send protection.
CREATE TABLE IF NOT EXISTS contact_submissions (
  submission_id TEXT PRIMARY KEY NOT NULL,
  payload_fingerprint TEXT NOT NULL CHECK (length(payload_fingerprint) = 64),
  internal_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (internal_status IN ('pending', 'sending', 'sent', 'failed', 'ambiguous')),
  confirmation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (confirmation_status IN ('pending', 'sending', 'sent', 'failed', 'ambiguous')),
  internal_attempted_at INTEGER,
  confirmation_attempted_at INTEGER,
  lease_token TEXT,
  lease_expires_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS contact_submissions_retention_idx
  ON contact_submissions (created_at);

CREATE TABLE IF NOT EXISTS contact_rate_limit_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  fingerprint TEXT NOT NULL CHECK (length(fingerprint) = 64),
  occurred_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS contact_rate_limit_events_window_idx
  ON contact_rate_limit_events (fingerprint, occurred_at);

CREATE INDEX IF NOT EXISTS contact_rate_limit_events_retention_idx
  ON contact_rate_limit_events (expires_at);

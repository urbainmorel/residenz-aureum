export const contactSchema = Object.freeze({
  contactRateLimitEvents: Object.freeze({
    primaryKey: ["event_id"],
    retention: "15-minute sliding window plus opportunistic cleanup",
    storesPii: false,
  }),
  contactSubmissions: Object.freeze({
    primaryKey: ["submission_id"],
    retention: "90 days plus opportunistic cleanup",
    statuses: ["pending", "sending", "sent", "failed", "ambiguous"],
    storesPii: false,
  }),
});

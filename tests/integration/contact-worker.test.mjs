import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { createD1AbuseStore } from "../../server/adapters/d1-abuse-store.js";
import {
  MailDeliveryError,
  createDisabledMailGateway,
} from "../../server/adapters/resend-mail-gateway.js";
import { handleContactRequest } from "../../worker/index.js";

const origin = "https://preview.residenz-aureum.test";
const rateLimitSecret = "test-only-secret-".repeat(3);

class BoundD1Statement {
  constructor(database, sql, bindings = []) {
    this.database = database;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...bindings) {
    return new BoundD1Statement(this.database, this.sql, bindings);
  }

  async all() {
    return {
      results: this.database.prepare(this.sql).all(...this.bindings),
    };
  }

  async first() {
    return this.database.prepare(this.sql).get(...this.bindings) ?? null;
  }

  async run() {
    const result = this.database.prepare(this.sql).run(...this.bindings);
    return { meta: { changes: Number(result.changes) } };
  }
}

class TestD1 {
  constructor(database) {
    this.database = database;
  }

  async batch(statements) {
    const results = [];
    for (const statement of statements) {
      results.push(await statement.run());
    }
    return results;
  }

  prepare(sql) {
    return new BoundD1Statement(this.database, sql);
  }
}

async function createDatabase() {
  const database = new DatabaseSync(":memory:");
  database.exec(await readFile("drizzle/0000_contact.sql", "utf8"));
  return database;
}

function payload(overrides = {}) {
  return {
    company: "",
    email: "anna@example.com",
    firstName: "Anna",
    formStartedAt: String(Date.now() - 5_000),
    intent: "visit",
    lastName: "Beispiel",
    locale: "de",
    message: "Ich möchte einen Besichtigungstermin vereinbaren.",
    phone: "+49 208 123 45",
    preferredContact: "email",
    preferredDate: "2026-09-15",
    privacyAccepted: true,
    submissionId: crypto.randomUUID(),
    ...overrides,
  };
}

function createGateway(overrides = {}) {
  const calls = [];
  return {
    calls,
    async sendConfirmation(message, options) {
      calls.push({ delivery: "confirmation", message, options });
      return { accepted: true };
    },
    async sendInternal(message, options) {
      calls.push({ delivery: "internal", message, options });
      return { accepted: true };
    },
    ...overrides,
  };
}

async function harness({ gateway = createGateway() } = {}) {
  const database = await createDatabase();
  const pending = [];
  const logs = [];
  return {
    config: {
      allowedOrigins: new Set([origin]),
      fallbackPhone: "+49 208 123 45",
      from: "Residenz Aureum <kontakt@example.test>",
      publicSiteUrl: origin,
      rateLimitSecret,
      to: "contact@example.test",
    },
    context: {
      waitUntil(promise) {
        pending.push(promise);
      },
    },
    database,
    d1: new TestD1(database),
    gateway,
    logger: {
      error(event, fields) {
        logs.push({ event, fields, level: "error" });
      },
      info(event, fields) {
        logs.push({ event, fields, level: "info" });
      },
    },
    logs,
    pending,
  };
}

function contactRequest(body, headerOverrides = {}) {
  const headers = new Headers({
    "cf-connecting-ip": "203.0.113.10",
    "content-type": "application/json; charset=UTF-8",
    origin,
    referer: `${origin}/de/kontakt-besichtigung/`,
    "sec-fetch-site": "same-origin",
  });
  for (const [name, value] of Object.entries(headerOverrides)) {
    if (value === null) {
      headers.delete(name);
    } else {
      headers.set(name, value);
    }
  }
  return new Request(`${origin}/api/contact`, {
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers,
    method: "POST",
  });
}

async function submit(h, body, headers) {
  return handleContactRequest(contactRequest(body, headers), {
    config: h.config,
    context: h.context,
    logger: h.logger,
    mailGateway: h.gateway,
    store: createD1AbuseStore(h.d1),
  });
}

test("applique réellement la migration et livre les deux emails DE", async () => {
  const h = await harness();
  const response = await submit(h, payload());
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(h.gateway.calls.length, 2);
  assert.deepEqual(
    h.gateway.calls.map(({ delivery }) => delivery),
    ["internal", "confirmation"],
  );
  assert.match(
    h.gateway.calls[0].options.idempotencyKey,
    /^contact-internal\//u,
  );
  assert.match(
    h.gateway.calls[1].options.idempotencyKey,
    /^contact-confirmation\//u,
  );
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("déduplique un replay complet et rejette un payload divergent", async () => {
  const h = await harness();
  const body = payload();
  assert.equal((await submit(h, body)).status, 202);
  assert.equal((await submit(h, body)).status, 202);
  assert.equal(h.gateway.calls.length, 2);

  const conflict = await submit(h, {
    ...body,
    message: "Ein anderer Inhalt mit derselben Referenz ist nicht zulässig.",
  });
  assert.equal(conflict.status, 400);
  assert.equal((await conflict.json()).code, "BAD_REQUEST");
  assert.equal(h.gateway.calls.length, 2);
});

test("reprend seulement l'accusé après une panne partielle", async () => {
  let confirmationAttempts = 0;
  const gateway = createGateway({
    async sendConfirmation(message, options) {
      gateway.calls.push({ delivery: "confirmation", message, options });
      confirmationAttempts += 1;
      if (confirmationAttempts === 1) {
        throw new MailDeliveryError({ ambiguous: false });
      }
      return { accepted: true };
    },
  });
  const h = await harness({ gateway });
  const body = payload();

  assert.equal((await submit(h, body)).status, 503);
  assert.equal((await submit(h, body)).status, 202);
  assert.equal(
    gateway.calls.filter(({ delivery }) => delivery === "internal").length,
    1,
  );
  assert.equal(
    gateway.calls.filter(({ delivery }) => delivery === "confirmation").length,
    2,
  );
  assert.equal(
    gateway.calls.filter(({ delivery }) => delivery === "confirmation")[0]
      .options.idempotencyKey,
    gateway.calls.filter(({ delivery }) => delivery === "confirmation")[1]
      .options.idempotencyKey,
  );
});

test("un claim concurrent retourne 503 et n'envoie jamais deux fois", async () => {
  let releaseInternal;
  let internalStarted;
  const started = new Promise((resolve) => {
    internalStarted = resolve;
  });
  const gate = new Promise((resolve) => {
    releaseInternal = resolve;
  });
  const gateway = createGateway({
    async sendInternal(message, options) {
      gateway.calls.push({ delivery: "internal", message, options });
      internalStarted();
      await gate;
      return { accepted: true };
    },
  });
  const h = await harness({ gateway });
  const body = payload();

  const first = submit(h, body);
  await started;
  const concurrent = await submit(h, body);
  assert.equal(concurrent.status, 503);
  releaseInternal();
  assert.equal((await first).status, 202);
  assert.equal(
    gateway.calls.filter(({ delivery }) => delivery === "internal").length,
    1,
  );
});

test("limite atomiquement six requêtes concurrentes à cinq", async () => {
  const h = await harness();
  const responses = await Promise.all(
    Array.from({ length: 6 }, () =>
      submit(h, payload({ submissionId: crypto.randomUUID() })),
    ),
  );
  assert.equal(responses.filter(({ status }) => status === 202).length, 5);
  assert.equal(responses.filter(({ status }) => status === 429).length, 1);
});

test("le honeypot répond uniformément sans email ni persistance", async () => {
  const h = await harness();
  const response = await submit(h, payload({ company: "spam" }));
  assert.equal(response.status, 202);
  assert.equal(h.gateway.calls.length, 0);
  assert.equal(
    h.database
      .prepare("SELECT COUNT(*) AS count FROM contact_submissions")
      .get().count,
    0,
  );
});

test("rejette origines, referer et Fetch Metadata non exacts", async () => {
  for (const headers of [
    { origin: "null" },
    { origin: `${origin}.evil.test` },
    { referer: "https://evil.test/" },
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
  ]) {
    const h = await harness();
    const response = await submit(h, payload(), headers);
    assert.equal(response.status, 400);
    assert.equal((await response.json()).code, "BAD_REQUEST");
    assert.equal(h.gateway.calls.length, 0);
  }

  const absent = await harness();
  assert.equal(
    (await submit(absent, payload(), { "sec-fetch-site": null })).status,
    202,
  );
});

test("rejette MIME, encodage, clés inconnues et corps surdimensionné", async () => {
  const cases = [
    [payload(), { "content-type": "text/plain" }],
    [payload(), { "content-encoding": "gzip" }],
    [{ ...payload(), unknown: true }, {}],
    [
      JSON.stringify({
        ...payload(),
        message: "x".repeat(33 * 1024),
      }),
      {},
    ],
  ];
  for (const [body, headers] of cases) {
    const h = await harness();
    const response = await submit(h, body, headers);
    assert.equal(response.status, 400);
    assert.equal(h.gateway.calls.length, 0);
  }
});

test("D1 et les logs ne contiennent aucune PII du formulaire", async () => {
  const h = await harness();
  const body = payload({
    email: "pii-unique@example.com",
    firstName: "PrenomUnique",
    message: "Message personnel unique qui ne doit jamais être stocké.",
    phone: "+49 999 888 777",
  });
  assert.equal((await submit(h, body)).status, 202);

  const stored = JSON.stringify({
    events: h.database.prepare("SELECT * FROM contact_rate_limit_events").all(),
    submissions: h.database.prepare("SELECT * FROM contact_submissions").all(),
  });
  const logs = JSON.stringify(h.logs);
  for (const secret of [body.email, body.firstName, body.message, body.phone]) {
    assert.doesNotMatch(stored, new RegExp(secret.replaceAll("+", "\\+"), "u"));
    assert.doesNotMatch(logs, new RegExp(secret.replaceAll("+", "\\+"), "u"));
  }
});

test("réessaie un état réseau ambigu sous 24 h avec la même clé", async () => {
  let attempts = 0;
  const gateway = createGateway({
    async sendInternal(message, options) {
      gateway.calls.push({ delivery: "internal", message, options });
      attempts += 1;
      if (attempts === 1) {
        throw new MailDeliveryError({ ambiguous: true });
      }
      return { accepted: true };
    },
  });
  const h = await harness({ gateway });
  const body = payload();
  assert.equal((await submit(h, body)).status, 503);
  assert.equal((await submit(h, body)).status, 202);
  const internal = gateway.calls.filter(
    ({ delivery }) => delivery === "internal",
  );
  assert.equal(internal.length, 2);
  assert.equal(
    internal[0].options.idempotencyKey,
    internal[1].options.idempotencyKey,
  );
});

test("ne réessaie jamais automatiquement un état ambigu après 24 h", async () => {
  const gateway = createGateway({
    async sendInternal(message, options) {
      gateway.calls.push({ delivery: "internal", message, options });
      throw new MailDeliveryError({ ambiguous: true });
    },
  });
  const h = await harness({ gateway });
  const body = payload();
  assert.equal((await submit(h, body)).status, 503);
  h.database
    .prepare(
      "UPDATE contact_submissions SET internal_attempted_at = ?1 WHERE submission_id = ?2",
    )
    .run(Date.now() - 24 * 60 * 60 * 1000 - 1, body.submissionId);
  assert.equal((await submit(h, body)).status, 503);
  assert.equal(gateway.calls.length, 1);
});

test("une panne D1 après acceptation conserve un état non rejouable aveuglément", async () => {
  const h = await harness();
  const realStore = createD1AbuseStore(h.d1);
  let failSentPersistence = true;
  const store = {
    ...realStore,
    async markDelivery(args) {
      if (
        failSentPersistence &&
        args.delivery === "internal" &&
        args.status === "sent"
      ) {
        failSentPersistence = false;
        throw new Error("D1_UNAVAILABLE");
      }
      return realStore.markDelivery(args);
    },
  };
  const body = payload();
  const response = await handleContactRequest(contactRequest(body), {
    config: h.config,
    context: h.context,
    logger: h.logger,
    mailGateway: h.gateway,
    store,
  });
  assert.equal(response.status, 503);
  const row = h.database
    .prepare(
      "SELECT internal_status FROM contact_submissions WHERE submission_id = ?1",
    )
    .get(body.submissionId);
  assert.equal(row.internal_status, "sending");
  assert.notEqual(row.internal_status, "failed");
});

test("chaque reprise failed consomme le rate-limit", async () => {
  const gateway = createGateway({
    async sendInternal(message, options) {
      gateway.calls.push({ delivery: "internal", message, options });
      throw new MailDeliveryError({ ambiguous: false });
    },
  });
  const h = await harness({ gateway });
  const body = payload();
  const statuses = [];
  for (let index = 0; index < 6; index += 1) {
    statuses.push((await submit(h, body)).status);
  }
  assert.deepEqual(statuses, [503, 503, 503, 503, 503, 429]);
  assert.equal(gateway.calls.length, 5);
});

test("le mode preview disabled retourne 503 sans appeler Resend", async () => {
  const h = await harness({ gateway: createDisabledMailGateway() });
  const body = payload();
  const response = await submit(h, body);
  assert.equal(response.status, 503);
  const stored = JSON.stringify(
    h.database.prepare("SELECT * FROM contact_submissions").all(),
  );
  assert.doesNotMatch(stored, /anna@example\.com|Besichtigungstermin/u);
});

test("planifie la purge sur les réponses 503 et 429", async () => {
  const gateway = createGateway({
    async sendInternal() {
      throw new MailDeliveryError({ ambiguous: false });
    },
  });
  const failed = await harness({ gateway });
  const body = payload();
  assert.equal((await submit(failed, body)).status, 503);
  assert.equal(failed.pending.length, 1);

  for (let index = 0; index < 4; index += 1) {
    assert.equal((await submit(failed, body)).status, 503);
  }
  assert.equal((await submit(failed, body)).status, 429);
  assert.equal(failed.pending.length, 6);
});

test("OPTIONS reste minimal et n'autorise que POST/content-type", async () => {
  const h = await harness();
  const request = new Request(`${origin}/api/contact`, {
    headers: {
      "access-control-request-headers": "content-type",
      "access-control-request-method": "POST",
      origin,
      referer: `${origin}/de/kontakt-besichtigung/`,
      "sec-fetch-site": "same-origin",
    },
    method: "OPTIONS",
  });
  const response = await handleContactRequest(request, {
    config: h.config,
    context: h.context,
    logger: h.logger,
    mailGateway: h.gateway,
    store: createD1AbuseStore(h.d1),
  });
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-origin"), origin);
  assert.equal(response.headers.get("access-control-allow-methods"), "POST");
  assert.equal(
    response.headers.get("access-control-allow-headers"),
    "content-type",
  );
  assert.equal(response.headers.get("access-control-allow-credentials"), null);
});

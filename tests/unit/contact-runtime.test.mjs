import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildWorker } from "../../scripts/build-worker.mjs";
import { validateRuntimeEnvironment } from "../../scripts/validate-runtime.mjs";
import { CONTACT_LEASE_MS } from "../../server/adapters/d1-abuse-store.js";
import { RESEND_TIMEOUT_MS } from "../../server/adapters/resend-mail-gateway.js";
import { loadContactRuntimeConfig } from "../../server/runtime/config.js";

const production = {
  CONTACT_ALLOWED_ORIGINS: "https://residenz-aureum.com",
  CONTACT_FALLBACK_PHONE: "+49208123456",
  CONTACT_RATE_LIMIT_SECRET: "a".repeat(48),
  CONTACT_RUNTIME_MODE: "production",
  CONTACT_TRANSPORT_MODE: "resend",
  PUBLIC_SITE_URL: "https://residenz-aureum.com",
  RESEND_API_KEY: "re_production_value",
  RESEND_CONTACT_TO: "contact@residenz-aureum.com",
  RESEND_DKIM_VERIFIED: "true",
  RESEND_DOMAIN_APPROVAL_REF:
    "https://github.com/urbainmorel/residenz-aureum/issues/123",
  RESEND_DOMAIN_VERIFIED: "true",
  RESEND_FROM_EMAIL: "Residenz Aureum <kontakt@mail.residenz-aureum.com>",
  RESEND_SPF_VERIFIED: "true",
};

test("la configuration production rejette tout placeholder", () => {
  assert.doesNotThrow(() => loadContactRuntimeConfig(production));
  assert.throws(() =>
    loadContactRuntimeConfig({
      ...production,
      RESEND_CONTACT_TO: "contact@example.invalid",
    }),
  );
  assert.throws(() =>
    loadContactRuntimeConfig({
      ...production,
      CONTACT_ALLOWED_ORIGINS: "*",
    }),
  );
  assert.throws(() =>
    loadContactRuntimeConfig({
      ...production,
      CONTACT_ALLOWED_ORIGINS: "https://preview.residenz-aureum.com",
    }),
  );
  for (const PUBLIC_SITE_URL of [
    "https://user:password@residenz-aureum.com",
    "https://residenz-aureum.com/path",
    "https://residenz-aureum.com/?query=1",
    "https://residenz-aureum.com/#hash",
  ]) {
    assert.throws(() =>
      loadContactRuntimeConfig({ ...production, PUBLIC_SITE_URL }),
    );
  }
  assert.throws(() =>
    loadContactRuntimeConfig({
      ...production,
      CONTACT_FALLBACK_PHONE: "banana",
    }),
  );
  assert.throws(() =>
    loadContactRuntimeConfig({
      ...production,
      RESEND_DKIM_VERIFIED: "false",
    }),
  );
  assert.throws(() =>
    loadContactRuntimeConfig({
      ...production,
      RESEND_DOMAIN_APPROVAL_REF:
        "https://approval.example.invalid/resend-domain",
    }),
  );
  for (const RESEND_DOMAIN_APPROVAL_REF of [
    "https://approval.%65xample%2Einvalid/path",
    "https://github.com/\nissues/123",
    "https://localhost/approval",
    "https://127.0.0.1/approval",
    "https://github.com/another/repository/issues/123",
    "https://github.com/urbainmorel/residenz-aureum/issues/123/not-an-approval",
    "https://github.com/urbainmorel/residenz-aureum/pull/9/files",
  ]) {
    assert.throws(() =>
      loadContactRuntimeConfig({
        ...production,
        RESEND_DOMAIN_APPROVAL_REF,
      }),
    );
  }
  for (const RESEND_CONTACT_TO of [
    "contact@a..com",
    "contact@%65xample%2Einvalid.com",
    "Name <contact@residenz-aureum.com>",
  ]) {
    assert.throws(() =>
      loadContactRuntimeConfig({ ...production, RESEND_CONTACT_TO }),
    );
  }
  assert.throws(() =>
    loadContactRuntimeConfig({
      ...production,
      RESEND_FROM_EMAIL:
        "Residenz Aureum <kontakt@mail.residenz-aureum.com>\r\nBcc: victim@example.com",
    }),
  );
});

test("le runtime lie le téléphone à la coordonnée client approuvée", async () => {
  const organization = {
    contact: {
      approvalRef: "https://github.com/urbainmorel/residenz-aureum/issues/124",
      phoneHref: production.CONTACT_FALLBACK_PHONE,
      status: "validated",
    },
  };
  await assert.doesNotReject(() =>
    validateRuntimeEnvironment(production, { organization }),
  );
  await assert.rejects(() =>
    validateRuntimeEnvironment(production, {
      organization: {
        contact: {
          ...organization.contact,
          phoneHref: "+49208999999",
        },
      },
    }),
  );
  await assert.rejects(() =>
    validateRuntimeEnvironment(production, {
      organization: {
        contact: {
          ...organization.contact,
          approvalRef: "mock-ref",
        },
      },
    }),
  );
});

test("le bundle Worker élimine le logger de développement Resend", async () => {
  await buildWorker();
  const bundle = await readFile("dist/server/index.js", "utf8");
  assert.doesNotMatch(bundle, /\[Resend API Error\]/u);
  assert.match(bundle, /contact-internal\//u);
  assert.equal(
    await readFile("dist/.openai/drizzle/0000_contact.sql", "utf8"),
    await readFile("drizzle/0000_contact.sql", "utf8"),
  );
});

test("le lease couvre les deux timeouts Resend séquentiels", () => {
  assert.ok(CONTACT_LEASE_MS > RESEND_TIMEOUT_MS * 2);
});

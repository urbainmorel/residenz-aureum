import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { prepareMedia } from "../../scripts/prepare-media.mjs";
import { loadSiteData } from "../../scripts/lib/site-data.mjs";
import { validateMedia } from "../../scripts/validate-media.mjs";

const SELECTED_IDS = [
  "activity-flowers-a",
  "admission-a",
  "care-conversation-a",
  "common-lounge-a",
  "garden-a",
  "hero-garden-a",
  "room-b",
];

async function readRegister() {
  return JSON.parse(await readFile("assets/media/ai-assets.json", "utf8"));
}

test("le registre inventorie les 15 candidats sans prétendre représenter la résidence", async () => {
  const register = await readRegister();
  const candidates = register.assets.filter(
    ({ path, variantOf }) =>
      variantOf === null && path.startsWith("assets/media/candidates/"),
  );

  assert.equal(candidates.length, 15);
  assert.deepEqual(
    candidates
      .filter(({ selected }) => selected)
      .map(({ id }) => id)
      .sort(),
    SELECTED_IDS,
  );
  for (const candidate of candidates) {
    assert.equal(candidate.approvalStatus, "pending");
    assert.equal(candidate.approvalReference, null);
    assert.equal(candidate.representsResidence, false);
    assert.ok(candidate.prompt.length >= 40);
    assert.ok(candidate.alt.de.length >= 10);
    assert.ok(candidate.alt.fr.length >= 10);
  }
});

test("la preview possède toutes les variantes WebP et respecte les budgets", async () => {
  const result = await validateMedia({ mode: "preview" });

  assert.deepEqual(result, {
    assets: 89,
    candidates: 15,
    delivered: 37,
    references: 7,
    selected: 7,
  });
});

test("mediaById fournit le contrat responsive localisé attendu par l’UI", async () => {
  const siteData = await loadSiteData({ mode: "preview" });

  assert.deepEqual(Object.keys(siteData.mediaById).sort(), SELECTED_IDS);
  for (const media of Object.values(siteData.mediaById)) {
    assert.equal(media.approvalStatus, "pending");
    assert.equal(media.representsResidence, false);
    assert.equal(media.previewOnly, true);
    assert.equal(media.variants.length, 5);
    assert.ok(media.alt.de);
    assert.ok(media.alt.fr);
    assert.ok(
      media.variants.every(({ publicPath, src }) => {
        return (
          publicPath === src &&
          publicPath.startsWith(`/media/preview/${media.id}/`)
        );
      }),
    );
  }
  assert.equal(siteData.mediaById["hero-garden-a"].portraitVariants.length, 2);
  assert.ok(
    Object.values(siteData.mediaById)
      .filter(({ id }) => id !== "hero-garden-a")
      .every(({ portraitVariants }) => portraitVariants.length === 0),
  );
});

test("la préparation production refuse les sources en attente avant toute copie", async () => {
  await assert.rejects(
    prepareMedia({ mode: "production" }),
    /médias non approuvés/i,
  );
});

test("la validation production refuse tout média de preview public", async () => {
  await assert.rejects(
    validateMedia({ mode: "production" }),
    /médias de preview sont encore publics/i,
  );
});

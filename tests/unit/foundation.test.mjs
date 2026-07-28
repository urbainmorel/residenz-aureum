import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { loadSiteData, routeForPath } from "../../scripts/lib/site-data.mjs";
import { findUnsafeTrackedEnvironmentFiles } from "../../scripts/validate-foundation.mjs";
import { chooseLocale } from "../../src/scripts/language.js";
import {
  renderLocalizedPage,
  renderRootPage,
} from "../../src/templates/layout.mjs";

const assets = {
  script: "/assets/app-test.js",
  styles: ["/assets/app-test.css"],
};

test("le manifest relie exactement douze paires de routes", async () => {
  const siteData = await loadSiteData({ mode: "preview" });

  assert.equal(siteData.routes.length, 12);
  assert.equal(siteData.locales.length, 2);
  assert.equal(siteData.routes[0].paths.de, "/de/");
  assert.equal(siteData.routes[0].paths.fr, "/fr/");
});

test("une route localisée retrouve son identifiant et sa langue", async () => {
  const siteData = await loadSiteData({ mode: "preview" });
  const match = routeForPath(siteData, "/fr/chambres-suites/");

  assert.equal(match?.locale, "fr");
  assert.equal(match?.route.id, "rooms");
  assert.equal(routeForPath(siteData, "/fr/inconnue/"), null);
});

test("le build de production refuse tous les contenus de travail", async () => {
  await assert.rejects(
    loadSiteData({ mode: "production" }),
    /Build production bloqué/,
  );
});

test("le choix explicite de langue prime sur la détection", () => {
  assert.equal(chooseLocale({ languages: ["fr-FR"], savedLocale: "de" }), "de");
  assert.equal(chooseLocale({ languages: ["fr-CA"] }), "fr");
  assert.equal(chooseLocale({ languages: ["en-GB"] }), "de");
});

test("le template échappe le contenu et génère les métadonnées jumelles", async () => {
  const siteData = await loadSiteData({ mode: "preview" });
  const route = siteData.routes.find(({ id }) => id === "about");
  const sourcePage = siteData.localizedContent.fr.pages.about;
  const html = renderLocalizedPage({
    assets,
    locale: "fr",
    page: {
      ...sourcePage,
      heading: '<script>alert("x")</script>',
    },
    route,
    siteData,
  });

  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<h1><script>/);
  assert.match(html, /hreflang="de"/);
  assert.match(html, /hreflang="fr"/);
  assert.match(html, /hreflang="x-default"/);
  assert.match(html, /meta name="robots" content="noindex, nofollow"/);
  assert.match(html, new RegExp(`© ${siteData.copyrightYear}`));
  assert.doesNotMatch(
    await readFile("src/templates/layout.mjs", "utf8"),
    /new Date\(/,
  );
});

test("la racine expose deux liens crawlables sans JavaScript", async () => {
  const siteData = await loadSiteData({ mode: "preview" });
  const html = renderRootPage({ assets, siteData });

  assert.match(html, /href="\/de\/"/);
  assert.match(html, /href="\/fr\/"/);
  assert.match(html, /data-root-locale-selector/);
});

test("la navigation reste visible sans JavaScript et le bouton reste inactif", async () => {
  const siteData = await loadSiteData({ mode: "preview" });
  const route = siteData.routes.find(({ id }) => id === "about");
  const html = renderLocalizedPage({
    assets,
    locale: "fr",
    page: siteData.localizedContent.fr.pages.about,
    route,
    siteData,
  });
  const css = await readFile("src/styles/components.css", "utf8");
  const mainModule = await readFile("src/scripts/main.js", "utf8");

  assert.match(html, /<button[^>]+data-menu-toggle hidden>/);
  assert.match(html, /<nav[^>]+data-menu>/);
  assert.match(html, /href="\/fr\/chambres-suites\/"/);
  assert.match(css, /\.has-js \.menu-toggle:not\(\[hidden\]\)/);
  assert.match(css, /\.has-js \.primary-navigation:not\(\[data-open\]\)/);
  assert.ok(
    mainModule.indexOf('classList.add("has-js")') <
      mainModule.indexOf("function initialize"),
  );
});

test("seuls les fichiers d’environnement suivis sont bloqués", () => {
  assert.deepEqual(
    findUnsafeTrackedEnvironmentFiles([".env.example", "docs/.env.example"]),
    [],
  );
  assert.deepEqual(
    findUnsafeTrackedEnvironmentFiles([
      ".env.example",
      ".env.local",
      "config/.env.production",
    ]),
    [".env.local", "config/.env.production"],
  );
});

test("les commandes Node locales chargent .env.local sans l’exiger", async () => {
  const packageJson = JSON.parse(await readFile("package.json", "utf8"));
  const localScripts = [
    "dev",
    "build",
    "build:preview",
    "build:production",
    "preview",
    "preview:worker",
    "validate",
    "validate:production",
    "test",
  ];

  for (const script of localScripts) {
    assert.match(
      packageJson.scripts[script],
      /--env-file-if-exists=\.env\.local/,
      `${script} doit charger .env.local avec l’option Node native`,
    );
  }
});

test("l’ordre des couches CSS précède les imports", async () => {
  const mainCss = await readFile("src/styles/main.css", "utf8");

  assert.ok(mainCss.indexOf("@layer reset") < mainCss.indexOf("@import"));
});

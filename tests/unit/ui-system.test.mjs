import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";
import { loadSiteData } from "../../scripts/lib/site-data.mjs";
import { validateContactPayload } from "../../src/scripts/contact-form.js";
import { renderLocalizedPage } from "../../src/templates/layout.mjs";

const assets = {
  script: "/assets/app-test.js",
  styles: ["/assets/app-test.css"],
};

test("la page d’accueil porte les signatures Quiet Luxury progressives", async () => {
  const siteData = await loadSiteData({ mode: "preview" });
  const route = siteData.routes.find(({ id }) => id === "home");
  const page = siteData.localizedContent.fr.pages.home;
  const html = renderLocalizedPage({
    assets,
    locale: "fr",
    page,
    route,
    siteData,
  });

  assert.match(html, /class="trust-bar"/);
  assert.match(html, /class="page-hero page-hero-home"/);
  assert.match(html, /class="hero-copy"/);
  assert.match(html, /class="hero-visual"/);
  assert.match(html, /class="availability-card"/);
  assert.match(html, /Contenu provisoire de démonstration/);
  assert.match(html, /<details>/);
  assert.match(html, /data-menu-toggle hidden/);
  assert.match(html, /class="navigation-language"/);
  assert.match(html, /data-menu-close-label hidden/);
  assert.equal((html.match(/rel="preload" as="image"/g) || []).length, 1);
  assert.match(html, /object-position:58% 42%/);

  const contactRoute = siteData.routes.find(({ id }) => id === "contact");
  const contactHtml = renderLocalizedPage({
    assets,
    locale: "fr",
    page: siteData.localizedContent.fr.pages.contact,
    route: contactRoute,
    siteData,
  });
  assert.match(contactHtml, /class="honeypot" aria-hidden="true" inert hidden/);
});

test("exactement deux WOFF2 critiques sont auto-hébergées", async () => {
  const fontFiles = (await readdir("public/fonts")).filter((name) =>
    name.endsWith(".woff2"),
  );
  const fontCss = await readFile("src/styles/fonts.css", "utf8");

  assert.deepEqual(fontFiles.sort(), [
    "dm-serif-display-latin-400.woff2",
    "manrope-latin-variable.woff2",
  ]);
  for (const fontFile of fontFiles) {
    assert.match(fontCss, new RegExp(fontFile.replaceAll(".", "\\.")));
  }
  assert.match(fontCss, /font-weight: 200 800/);
});

test("la validation du formulaire conserve les valeurs et signale les champs", () => {
  const invalid = validateContactPayload(
    {
      email: "adresse-invalide",
      firstName: "",
      intent: "visit",
      lastName: "Exemple",
      message: "Trop court",
      preferredContact: "email",
      privacyAccepted: false,
    },
    "fr",
  );

  assert.equal(invalid.values.lastName, "Exemple");
  assert.ok(invalid.errors.firstName);
  assert.ok(invalid.errors.email);
  assert.ok(invalid.errors.message);
  assert.ok(invalid.errors.privacyAccepted);

  const valid = validateContactPayload(
    {
      email: "anna@example.com",
      firstName: " Anna ",
      intent: "general",
      lastName: "Exemple",
      message: "Je souhaite recevoir des informations générales sur le projet.",
      phone: "+49 208 123 45",
      preferredContact: "email",
      preferredDate: "",
      privacyAccepted: "true",
    },
    "fr",
  );

  assert.deepEqual(valid.errors, {});
  assert.equal(valid.values.firstName, "Anna");
  assert.equal(valid.values.privacyAccepted, true);
});

test("les styles couvrent le reflow, le focus et le mouvement réduit", async () => {
  const [base, components, forms, layout, motion, sections] = await Promise.all(
    [
      readFile("src/styles/base.css", "utf8"),
      readFile("src/styles/components.css", "utf8"),
      readFile("src/styles/forms.css", "utf8"),
      readFile("src/styles/layout.css", "utf8"),
      readFile("src/styles/motion.css", "utf8"),
      readFile("src/styles/sections.css", "utf8"),
    ],
  );
  const css = [base, components, forms, layout, motion, sections].join("\n");

  assert.match(css, /@media \(max-width: 35rem\)/);
  assert.match(css, /@media \(max-width: 63\.99rem\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  assert.match(css, /min-height: 2\.75rem/);
  assert.match(css, /\[aria-invalid="true"\]/);
  assert.match(css, /grid-template-columns: minmax\(0, 5fr\) minmax\(0, 7fr\)/);
  assert.match(css, /scroll-margin-top: 7rem/);
  assert.match(css, /\.hero-visual \.media-preview > p/);
});

const labels = {
  de: {
    alternate: "Français",
    brandLabel: "Residenz Aureum – Startseite",
    closeMenu: "Menü schließen",
    draft:
      "Arbeitsvorschau – Inhalt noch nicht zur Veröffentlichung freigegeben",
    home: "Startseite",
    legal: "Impressum",
    menu: "Menü",
    navigation: "Hauptnavigation",
    privacy: "Datenschutz",
    skip: "Zum Hauptinhalt",
  },
  fr: {
    alternate: "Deutsch",
    brandLabel: "Residenz Aureum – Accueil",
    closeMenu: "Fermer le menu",
    draft: "Aperçu de travail — contenu non encore autorisé à la publication",
    home: "Accueil",
    legal: "Mentions légales",
    menu: "Menu",
    navigation: "Navigation principale",
    privacy: "Confidentialité",
    skip: "Aller au contenu principal",
  },
};

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function renderAssetLinks(assets) {
  const styles = assets.styles
    .map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`)
    .join("\n    ");

  return `${styles}
    <script type="module" src="${escapeHtml(assets.script)}"></script>`;
}

function renderNavigation({ locale, routes, localizedContent, activeRouteId }) {
  const localeLabels = labels[locale];
  const items = routes
    .filter(({ navigation }) => navigation !== null)
    .sort((left, right) => left.navigation - right.navigation)
    .map((route) => {
      const page = localizedContent[locale].pages[route.id];
      const current = route.id === activeRouteId ? ' aria-current="page"' : "";
      return `<li><a href="${route.paths[locale]}"${current}>${escapeHtml(page.title.split(" | ")[0])}</a></li>`;
    })
    .join("");

  return `<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation" data-menu-toggle hidden>
          <span data-menu-open-label>${escapeHtml(localeLabels.menu)}</span>
          <span class="u-visually-hidden" data-menu-close-label>${escapeHtml(localeLabels.closeMenu)}</span>
        </button>
        <nav id="primary-navigation" class="primary-navigation" aria-label="${escapeHtml(localeLabels.navigation)}" data-menu>
          <ul>${items}</ul>
        </nav>`;
}

function renderFooter({ copyrightYear, locale, routes }) {
  const localeLabels = labels[locale];
  const legal = routes.find(({ id }) => id === "legal");
  const privacy = routes.find(({ id }) => id === "privacy");

  return `<footer class="site-footer">
      <div class="shell footer-inner">
        <p>© ${copyrightYear} Residenz Aureum</p>
        <ul>
          <li><a href="${legal.paths[locale]}">${escapeHtml(localeLabels.legal)}</a></li>
          <li><a href="${privacy.paths[locale]}">${escapeHtml(localeLabels.privacy)}</a></li>
        </ul>
      </div>
    </footer>`;
}

export function renderLocalizedPage({ assets, locale, page, route, siteData }) {
  const localeLabels = labels[locale];
  const alternateLocale = locale === "de" ? "fr" : "de";
  const canonicalUrl = `${siteData.baseUrl}${route.paths[locale]}`;
  const defaultUrl = `${siteData.baseUrl}${route.paths[siteData.defaultLocale]}`;
  const robots =
    siteData.mode === "preview" || page.state === "draft"
      ? "noindex, nofollow"
      : route.indexable
        ? "index, follow"
        : "noindex, follow";
  const sections = page.sections
    .map(
      (
        section,
      ) => `<section class="content-section" aria-labelledby="${escapeHtml(section.id)}-title">
        <div class="measure">
          <h2 id="${escapeHtml(section.id)}-title">${escapeHtml(section.heading)}</h2>
          ${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </div>
      </section>`,
    )
    .join("");
  const breadcrumbs =
    route.id === "home"
      ? ""
      : `<nav class="breadcrumbs shell" aria-label="Breadcrumb">
      <ol>
        <li><a href="${siteData.routes.find(({ id }) => id === "home").paths[locale]}">${escapeHtml(localeLabels.home)}</a></li>
        <li aria-current="page">${escapeHtml(page.title.split(" | ")[0])}</li>
      </ol>
    </nav>`;
  const structuredData =
    route.id === "home"
      ? ""
      : `<script type="application/ld+json">${safeJson({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            {
              "@type": "ListItem",
              position: 1,
              name: localeLabels.home,
              item: `${siteData.baseUrl}${siteData.routes.find(({ id }) => id === "home").paths[locale]}`,
            },
            {
              "@type": "ListItem",
              position: 2,
              name: page.title.split(" | ")[0],
              item: canonicalUrl,
            },
          ],
        })}</script>`;

  return `<!doctype html>
<html lang="${locale}" data-build-mode="${siteData.mode}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.metaDescription)}">
    <meta name="robots" content="${robots}">
    <link rel="canonical" href="${canonicalUrl}">
    <link rel="alternate" hreflang="de" href="${siteData.baseUrl}${route.paths.de}">
    <link rel="alternate" hreflang="fr" href="${siteData.baseUrl}${route.paths.fr}">
    <link rel="alternate" hreflang="x-default" href="${defaultUrl}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.metaDescription)}">
    <meta property="og:url" content="${canonicalUrl}">
    <meta property="og:locale" content="${locale === "de" ? "de_DE" : "fr_FR"}">
    <meta property="og:locale:alternate" content="${locale === "de" ? "fr_FR" : "de_DE"}">
    ${renderAssetLinks(assets)}
    ${structuredData}
  </head>
  <body data-locale="${locale}">
    <a class="skip-link" href="#main-content">${escapeHtml(localeLabels.skip)}</a>
    <header class="site-header">
      <div class="shell header-inner">
        <a class="brand" href="${siteData.routes.find(({ id }) => id === "home").paths[locale]}" aria-label="${escapeHtml(localeLabels.brandLabel)}">
          <span aria-hidden="true">A</span>
          <strong>Residenz Aureum</strong>
        </a>
        ${renderNavigation({
          activeRouteId: route.id,
          locale,
          localizedContent: siteData.localizedContent,
          routes: siteData.routes,
        })}
        <a class="language-link" href="${route.paths[alternateLocale]}" lang="${alternateLocale}" hreflang="${alternateLocale}" data-language-choice>${escapeHtml(localeLabels.alternate)}</a>
      </div>
    </header>
    ${breadcrumbs}
    <main id="main-content" tabindex="-1">
      ${
        page.state === "draft"
          ? `<p class="draft-notice" role="status">${escapeHtml(localeLabels.draft)}</p>`
          : ""
      }
      <section class="page-hero">
        <div class="shell measure">
          <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
          <h1>${escapeHtml(page.heading)}</h1>
          <p class="lead">${escapeHtml(page.intro)}</p>
        </div>
      </section>
      ${sections}
    </main>
    ${renderFooter({
      copyrightYear: siteData.copyrightYear,
      locale,
      routes: siteData.routes,
    })}
  </body>
</html>`;
}

export function renderRootPage({ assets, siteData }) {
  const deHome = siteData.routes.find(({ id }) => id === "home").paths.de;
  const frHome = siteData.routes.find(({ id }) => id === "home").paths.fr;

  return `<!doctype html>
<html lang="de" data-build-mode="${siteData.mode}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Residenz Aureum | Sprache wählen</title>
    <meta name="description" content="Wählen Sie Deutsch oder Français, um die Website der Residenz Aureum zu besuchen.">
    <meta name="robots" content="${siteData.mode === "preview" ? "noindex, nofollow" : "index, follow"}">
    <link rel="canonical" href="${siteData.baseUrl}/">
    <link rel="alternate" hreflang="de" href="${siteData.baseUrl}${deHome}">
    <link rel="alternate" hreflang="fr" href="${siteData.baseUrl}${frHome}">
    <link rel="alternate" hreflang="x-default" href="${siteData.baseUrl}/">
    ${renderAssetLinks(assets)}
  </head>
  <body data-root-locale-selector>
    <a class="skip-link" href="#main-content">Zum Hauptinhalt</a>
    <main id="main-content" class="language-gateway" tabindex="-1">
      <div class="measure">
        <p class="eyebrow">Residenz Aureum</p>
        <h1>Willkommen · Bienvenue</h1>
        <p>Bitte wählen Sie Ihre Sprache. Choisissez votre langue.</p>
        <div class="language-actions">
          <a class="button" href="${deHome}" lang="de" data-language-choice>Deutsch</a>
          <a class="button button-secondary" href="${frHome}" lang="fr" data-language-choice>Français</a>
        </div>
      </div>
    </main>
  </body>
</html>`;
}

export function renderNotFoundPage({ assets, locale, siteData }) {
  const copy =
    locale === "fr"
      ? {
          description: "La page demandée est introuvable.",
          heading: "Page introuvable",
          home: "Revenir à l’accueil",
          title: "Page introuvable | Residenz Aureum",
        }
      : {
          description: "Die gewünschte Seite wurde nicht gefunden.",
          heading: "Seite nicht gefunden",
          home: "Zur Startseite",
          title: "Seite nicht gefunden | Residenz Aureum",
        };
  const home = siteData.routes.find(({ id }) => id === "home").paths[locale];

  return `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${copy.title}</title>
    <meta name="description" content="${copy.description}">
    <meta name="robots" content="noindex, follow">
    ${renderAssetLinks(assets)}
  </head>
  <body>
    <a class="skip-link" href="#main-content">${escapeHtml(labels[locale].skip)}</a>
    <main id="main-content" class="language-gateway" tabindex="-1">
      <div class="measure">
        <p class="eyebrow">404</p>
        <h1>${copy.heading}</h1>
        <p>${copy.description}</p>
        <a class="button" href="${home}">${copy.home}</a>
      </div>
    </main>
  </body>
</html>`;
}

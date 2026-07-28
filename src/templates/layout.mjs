const labels = {
  de: {
    address: "Adresse",
    alternate: "Français",
    brandLabel: "Residenz Aureum – Startseite",
    checklist: "Checkliste",
    closeMenu: "Menü schließen",
    contact: "Kontakt",
    draft:
      "Arbeitsvorschau – Inhalt noch nicht zur Veröffentlichung freigegeben",
    errors: "Bitte prüfen Sie die markierten Felder.",
    home: "Startseite",
    legal: "Impressum",
    menu: "Menü",
    mock: "Vorläufiger Demo-Inhalt",
    navigation: "Hauptnavigation",
    openingHours: "Erreichbarkeit",
    privacy: "Datenschutz",
    privacyDetails: "Datenschutzerklärung lesen",
    required: "Pflichtfeld",
    skip: "Zum Hauptinhalt",
  },
  fr: {
    address: "Adresse",
    alternate: "Deutsch",
    brandLabel: "Residenz Aureum – Accueil",
    checklist: "Liste de vérification",
    closeMenu: "Fermer le menu",
    contact: "Contact",
    draft: "Aperçu de travail — contenu non encore autorisé à la publication",
    errors: "Veuillez vérifier les champs signalés.",
    home: "Accueil",
    legal: "Mentions légales",
    menu: "Menu",
    mock: "Contenu provisoire de démonstration",
    navigation: "Navigation principale",
    openingHours: "Disponibilité",
    privacy: "Confidentialité",
    privacyDetails: "Lire la politique de confidentialité",
    required: "Champ obligatoire",
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

function renderMockNotice(locale) {
  return `<p class="mock-notice" data-mock-notice>${escapeHtml(labels[locale].mock)}</p>`;
}

function renderTrackedNotice(item, locale) {
  return item.status === "mock" ? renderMockNotice(locale) : "";
}

function renderNavigation({ locale, routes, localizedContent, activeRouteId }) {
  const localeLabels = labels[locale];
  const items = routes
    .filter(({ navigation }) => navigation !== null)
    .sort((left, right) => left.navigation - right.navigation)
    .map((route) => {
      const page = localizedContent[locale].pages[route.id];
      const current = route.id === activeRouteId ? ' aria-current="page"' : "";
      return `<li><a href="${escapeHtml(route.paths[locale])}"${current}>${escapeHtml(page.title.split(" | ")[0])}</a></li>`;
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

function renderOrganizationContact({
  id = "footer-contact",
  locale,
  organization,
}) {
  if (!organization?.contact) {
    return "";
  }

  const localeLabels = labels[locale];
  const { address, email, openingHours, phoneDisplay, phoneHref, status } =
    organization.contact;
  const statusAttribute =
    status === "mock" ? ' data-status="mock"' : ' data-status="validated"';

  const headingId = `${id}-${locale}`;

  return `<section class="footer-contact"${statusAttribute} aria-labelledby="${escapeHtml(headingId)}">
          <h2 id="${escapeHtml(headingId)}">${escapeHtml(localeLabels.contact)}</h2>
          ${status === "mock" ? renderMockNotice(locale) : ""}
          <address>
            <p><strong>${escapeHtml(localeLabels.address)}</strong><br>
              ${escapeHtml(address.street)}<br>
              ${escapeHtml(address.postalCode)} ${escapeHtml(address.city)}<br>
              ${escapeHtml(address.country)}
            </p>
            <p>
              <a href="tel:${escapeHtml(phoneHref)}">${escapeHtml(phoneDisplay)}</a><br>
              <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
            </p>
          </address>
          <div>
            <h3>${escapeHtml(localeLabels.openingHours)}</h3>
            <dl>
              ${openingHours
                .map(
                  ({ days, hours }) =>
                    `<div><dt>${escapeHtml(days)}</dt><dd>${escapeHtml(hours)}</dd></div>`,
                )
                .join("")}
            </dl>
          </div>
        </section>`;
}

function renderFooter({ copyrightYear, locale, organization, routes }) {
  const localeLabels = labels[locale];
  const legal = routes.find(({ id }) => id === "legal");
  const privacy = routes.find(({ id }) => id === "privacy");

  return `<footer class="site-footer">
      <div class="shell footer-content">
        ${renderOrganizationContact({ locale, organization })}
        <div class="footer-inner">
          <p>© ${copyrightYear} Residenz Aureum</p>
          <ul>
            <li><a href="${escapeHtml(legal.paths[locale])}">${escapeHtml(localeLabels.legal)}</a></li>
            <li><a href="${escapeHtml(privacy.paths[locale])}">${escapeHtml(localeLabels.privacy)}</a></li>
          </ul>
        </div>
      </div>
    </footer>`;
}

function normalizedVariants(media) {
  if (!media) {
    return [];
  }

  if (Array.isArray(media.variants)) {
    return media.variants
      .map((variant) => ({
        height: variant.height,
        src: variant.publicPath || variant.src || variant.path,
        width: Number(variant.width),
      }))
      .filter(({ src, width }) => src && Number.isFinite(width));
  }

  if (media.variants && typeof media.variants === "object") {
    return Object.entries(media.variants)
      .map(([width, variant]) => ({
        height: typeof variant === "object" ? variant.height : undefined,
        src:
          typeof variant === "string"
            ? variant
            : variant.publicPath || variant.src || variant.path,
        width: Number(width),
      }))
      .filter(({ src, width }) => src && Number.isFinite(width));
  }

  const src = media.publicPath || media.src;
  return src ? [{ height: media.height, src, width: Number(media.width) }] : [];
}

function localizedValue(value, locale) {
  return typeof value === "string" ? value : value?.[locale] || "";
}

function renderMedia({
  context = "content",
  locale,
  mediaId,
  siteData,
  title = "",
}) {
  if (!mediaId) {
    return "";
  }

  const media = siteData.mediaById?.[mediaId];
  const variants = normalizedVariants(media).sort(
    (left, right) => left.width - right.width,
  );
  const alt = localizedValue(media?.alt, locale) || title;
  const approved = media?.approvalStatus === "approved";
  const publicVariants = variants.filter(({ src }) => src.startsWith("/"));

  if (!approved || publicVariants.length === 0) {
    const accessibility = alt
      ? ` role="img" aria-label="${escapeHtml(alt)}"`
      : ' aria-hidden="true"';
    return `<figure class="media-placeholder"${accessibility} data-media-id="${escapeHtml(mediaId)}" data-media-status="${escapeHtml(media?.approvalStatus || "unregistered")}">
      <span aria-hidden="true">${escapeHtml(mediaId)}</span>
    </figure>`;
  }

  const fallback = publicVariants.at(-1);
  const srcset = publicVariants
    .map(({ src, width }) => `${escapeHtml(src)} ${width}w`)
    .join(", ");
  const priorityAttributes =
    context === "hero"
      ? ' loading="eager" fetchpriority="high"'
      : ' loading="lazy" fetchpriority="auto"';
  const dimensions =
    Number.isFinite(fallback.width) && Number.isFinite(Number(fallback.height))
      ? ` width="${fallback.width}" height="${Number(fallback.height)}"`
      : "";
  const focalPoint = media.focalPoint
    ? ` style="object-position:${escapeHtml(
        typeof media.focalPoint === "string"
          ? media.focalPoint
          : `${media.focalPoint.x}% ${media.focalPoint.y}%`,
      )}"`
    : "";

  return `<picture class="media media-${escapeHtml(context)}" data-media-id="${escapeHtml(mediaId)}">
      <img src="${escapeHtml(fallback.src)}" srcset="${srcset}" sizes="${context === "hero" ? "(min-width: 64rem) 58vw, 100vw" : "(min-width: 64rem) 40vw, 100vw"}" alt="${escapeHtml(alt)}"${dimensions}${priorityAttributes} decoding="async"${focalPoint}>
    </picture>`;
}

function renderSectionHeader(section) {
  return `<div class="section-heading">
      <h2 id="${escapeHtml(section.id)}-title">${escapeHtml(section.heading)}</h2>
      ${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ""}
    </div>`;
}

function renderProse(section, context) {
  const { locale, siteData } = context;
  return `<section id="${escapeHtml(section.id)}" class="content-section section-prose" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell section-layout">
        <div class="measure">
          ${renderSectionHeader(section)}
          ${section.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </div>
        ${renderMedia({
          locale,
          mediaId: section.mediaId,
          siteData,
          title: section.heading,
        })}
      </div>
    </section>`;
}

function renderFeatureList(section, context) {
  const { locale } = context;
  return `<section id="${escapeHtml(section.id)}" class="content-section section-${escapeHtml(section.type)}" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell">
        ${renderSectionHeader(section)}
        <ul class="feature-list">
          ${section.items
            .map(
              (item) => `<li data-status="${escapeHtml(item.status)}">
                <article>
                  <h3>${escapeHtml(item.title)}</h3>
                  ${renderTrackedNotice(item, locale)}
                  <p>${escapeHtml(item.body)}</p>
                </article>
              </li>`,
            )
            .join("")}
        </ul>
      </div>
    </section>`;
}

function renderStats(section, context) {
  const { locale } = context;
  return `<section id="${escapeHtml(section.id)}" class="content-section section-stats" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell">
        ${renderSectionHeader(section)}
        <dl class="stats-list">
          ${section.items
            .map(
              (item) => `<div data-status="${escapeHtml(item.status)}">
                <dt>${escapeHtml(item.label)}</dt>
                <dd>${escapeHtml(item.value)}</dd>
                ${item.note ? `<p>${escapeHtml(item.note)}</p>` : ""}
                ${renderTrackedNotice(item, locale)}
              </div>`,
            )
            .join("")}
        </dl>
      </div>
    </section>`;
}

function renderSteps(section, context) {
  const { locale } = context;
  return `<section id="${escapeHtml(section.id)}" class="content-section section-steps" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell">
        ${renderSectionHeader(section)}
        <ol class="steps-list">
          ${section.items
            .map(
              (item) => `<li data-status="${escapeHtml(item.status)}">
                <h3>${escapeHtml(item.title)}</h3>
                ${renderTrackedNotice(item, locale)}
                <p>${escapeHtml(item.body)}</p>
              </li>`,
            )
            .join("")}
        </ol>
      </div>
    </section>`;
}

function renderGallery(section, context) {
  const { locale, siteData } = context;
  return `<section id="${escapeHtml(section.id)}" class="content-section section-gallery" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell">
        ${renderSectionHeader(section)}
        <ul class="gallery-list">
          ${section.items
            .map(
              (item) => `<li data-status="${escapeHtml(item.status)}">
                <figure>
                  ${renderMedia({
                    locale,
                    mediaId: item.mediaId,
                    siteData,
                    title: item.title,
                  })}
                  <figcaption>
                    <h3>${escapeHtml(item.title)}</h3>
                    ${renderTrackedNotice(item, locale)}
                    <p>${escapeHtml(item.caption)}</p>
                  </figcaption>
                </figure>
              </li>`,
            )
            .join("")}
        </ul>
      </div>
    </section>`;
}

function renderTestimonials(section, context) {
  const { locale } = context;
  return `<section id="${escapeHtml(section.id)}" class="content-section section-testimonials" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell">
        ${renderSectionHeader(section)}
        <div class="testimonial-list">
          ${section.items
            .map(
              (item) => `<blockquote data-status="${escapeHtml(item.status)}">
                ${renderTrackedNotice(item, locale)}
                <p>“${escapeHtml(item.quote)}”</p>
                <footer>
                  <cite>${escapeHtml(item.name)}</cite>
                  <span>${escapeHtml(item.context)}</span>
                </footer>
              </blockquote>`,
            )
            .join("")}
        </div>
      </div>
    </section>`;
}

function renderFaq(section, context) {
  const { locale } = context;
  return `<section id="${escapeHtml(section.id)}" class="content-section section-faq" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell measure">
        ${renderSectionHeader(section)}
        <div class="faq-list" data-faq>
          ${section.items
            .map((item, index) => {
              const answerId = `${section.id}-answer-${index + 1}`;
              return `<article class="faq-item" data-status="${escapeHtml(item.status)}">
                <h3>
                  <button type="button" aria-expanded="true" aria-controls="${escapeHtml(answerId)}" data-faq-toggle>
                    ${escapeHtml(item.question)}
                  </button>
                </h3>
                ${renderTrackedNotice(item, locale)}
                <div id="${escapeHtml(answerId)}" data-faq-answer>
                  <p>${escapeHtml(item.answer)}</p>
                </div>
              </article>`;
            })
            .join("")}
        </div>
      </div>
    </section>`;
}

function renderGuides(section, context) {
  const { locale } = context;
  return `<section id="${escapeHtml(section.id)}" class="content-section section-guides" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell">
        ${renderSectionHeader(section)}
        <div class="guide-list">
          ${section.items
            .map(
              (guide) => `<article id="${escapeHtml(guide.slug)}" class="guide">
                <h3>${escapeHtml(guide.title)}</h3>
                <p class="lead">${escapeHtml(guide.summary)}</p>
                ${guide.body.map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("")}
                <h4>${escapeHtml(labels[locale].checklist)}</h4>
                <ul>
                  ${guide.checklist.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
                </ul>
                <time datetime="${escapeHtml(guide.updatedAt)}">${escapeHtml(guide.updatedAt)}</time>
              </article>`,
            )
            .join("")}
        </div>
      </div>
    </section>`;
}

function fieldAttributes(field) {
  const limits = {
    email: 254,
    firstName: 80,
    lastName: 80,
    message: 3000,
    phone: 30,
  };
  const minimums = { message: 20 };
  return [
    field.required ? "required" : "",
    field.autocomplete
      ? `autocomplete="${escapeHtml(field.autocomplete)}"`
      : "",
    limits[field.name] ? `maxlength="${limits[field.name]}"` : "",
    minimums[field.name] ? `minlength="${minimums[field.name]}"` : "",
    field.required ? 'aria-required="true"' : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function renderFormField(field, sectionId, locale) {
  const id = `${sectionId}-${field.name}`;
  const attributes = fieldAttributes(field);
  const requiredText = field.required
    ? `<span aria-hidden="true">*</span><span class="u-visually-hidden">${escapeHtml(labels[locale].required)}</span>`
    : "";

  if (field.type === "checkbox") {
    return `<div class="form-field form-field-checkbox">
      <input id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" type="checkbox" value="true" ${attributes} aria-describedby="${escapeHtml(id)}-error">
      <label for="${escapeHtml(id)}">${escapeHtml(field.label)} ${requiredText}</label>
      <p class="field-error" id="${escapeHtml(id)}-error" data-field-error="${escapeHtml(field.name)}"></p>
    </div>`;
  }

  const label = `<label for="${escapeHtml(id)}">${escapeHtml(field.label)} ${requiredText}</label>`;
  let control;

  if (field.type === "textarea") {
    control = `<textarea id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" rows="6" ${attributes} aria-describedby="${escapeHtml(id)}-error"></textarea>`;
  } else if (field.type === "select") {
    control = `<select id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" ${attributes} aria-describedby="${escapeHtml(id)}-error">
      ${field.options
        .map(
          ({ label: optionLabel, value }) =>
            `<option value="${escapeHtml(value)}">${escapeHtml(optionLabel)}</option>`,
        )
        .join("")}
    </select>`;
  } else {
    control = `<input id="${escapeHtml(id)}" name="${escapeHtml(field.name)}" type="${escapeHtml(field.type)}" ${attributes} aria-describedby="${escapeHtml(id)}-error">`;
  }

  return `<div class="form-field">
      ${label}
      ${control}
      <p class="field-error" id="${escapeHtml(id)}-error" data-field-error="${escapeHtml(field.name)}"></p>
    </div>`;
}

function renderContactForm(section, context) {
  const { locale, siteData } = context;
  const privacyRoute = siteData.routes.find(({ id }) => id === "privacy");

  return `<section id="${escapeHtml(section.id)}" class="content-section section-contact-form" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell form-layout">
        <div>
          ${renderSectionHeader(section)}
          ${renderOrganizationContact({
            id: `${section.id}-contact`,
            locale,
            organization: siteData.organization,
          })}
        </div>
        <form method="post" action="/api/contact" accept-charset="utf-8" data-contact-form>
          <div class="form-error-summary" role="alert" tabindex="-1" hidden data-form-errors>
            <h3>${escapeHtml(labels[locale].errors)}</h3>
            <ul></ul>
          </div>
          <input type="hidden" name="locale" value="${escapeHtml(locale)}">
          <input type="hidden" name="submissionId" value="" data-submission-id>
          <input type="hidden" name="formStartedAt" value="" data-form-started-at>
          <div class="honeypot" aria-hidden="true">
            <label for="${escapeHtml(section.id)}-company">Company</label>
            <input id="${escapeHtml(section.id)}-company" name="company" type="text" tabindex="-1" autocomplete="off">
          </div>
          <fieldset>
            <legend>${escapeHtml(section.heading)}</legend>
            ${section.intentOptions
              .map(
                ({ label: intentLabel, value }, index) => `<label>
                  <input type="radio" name="intent" value="${escapeHtml(value)}"${index === 0 ? " checked" : ""}>
                  ${escapeHtml(intentLabel)}
                </label>`,
              )
              .join("")}
          </fieldset>
          ${section.fields
            .map((field) => renderFormField(field, section.id, locale))
            .join("")}
          <p class="form-privacy">
            ${escapeHtml(section.privacyLabel)}
            <a href="${escapeHtml(privacyRoute.paths[locale])}">${escapeHtml(labels[locale].privacyDetails)}</a>
          </p>
          <p class="form-health-warning">${escapeHtml(section.healthWarning)}</p>
          <button class="button" type="submit">${escapeHtml(section.submitLabel)}</button>
          <p role="status" aria-live="polite" hidden data-form-success>${escapeHtml(section.successMessage)}</p>
        </form>
      </div>
    </section>`;
}

function renderCta(section) {
  return `<section id="${escapeHtml(section.id)}" class="content-section section-cta" aria-labelledby="${escapeHtml(section.id)}-title">
      <div class="shell measure">
        <h2 id="${escapeHtml(section.id)}-title">${escapeHtml(section.heading)}</h2>
        <p>${escapeHtml(section.body)}</p>
        <a class="button" href="${escapeHtml(section.href)}">${escapeHtml(section.label)}</a>
      </div>
    </section>`;
}

function renderSection(section, context) {
  switch (section.type) {
    case "prose":
      return renderProse(section, context);
    case "features":
    case "trustProofs":
      return renderFeatureList(section, context);
    case "stats":
      return renderStats(section, context);
    case "steps":
      return renderSteps(section, context);
    case "gallery":
      return renderGallery(section, context);
    case "testimonials":
      return renderTestimonials(section, context);
    case "faq":
      return renderFaq(section, context);
    case "guides":
      return renderGuides(section, context);
    case "contactForm":
      return renderContactForm(section, context);
    case "cta":
      return renderCta(section);
    default:
      throw new Error(`Type de bloc non pris en charge: ${section.type}`);
  }
}

function renderBreadcrumbs({ locale, page, route, siteData }) {
  if (route.id === "home") {
    return "";
  }

  const homeRoute = siteData.routes.find(({ id }) => id === "home");
  return `<nav class="breadcrumbs shell" aria-label="Breadcrumb">
      <ol>
        <li><a href="${escapeHtml(homeRoute.paths[locale])}">${escapeHtml(labels[locale].home)}</a></li>
        <li aria-current="page">${escapeHtml(page.title.split(" | ")[0])}</li>
      </ol>
    </nav>`;
}

function structuredDataForPage({ locale, page, route, siteData }) {
  const graph = [];
  const canonicalUrl = `${siteData.baseUrl}${route.paths[locale]}`;
  const homeRoute = siteData.routes.find(({ id }) => id === "home");

  if (route.id === "home") {
    graph.push({
      "@type": "Organization",
      name: siteData.organization?.name || "Residenz Aureum",
      url: canonicalUrl,
    });
  } else {
    graph.push({
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          item: `${siteData.baseUrl}${homeRoute.paths[locale]}`,
          name: labels[locale].home,
          position: 1,
        },
        {
          "@type": "ListItem",
          item: canonicalUrl,
          name: page.title.split(" | ")[0],
          position: 2,
        },
      ],
    });
  }

  const validatedFaq = page.sections
    .filter(({ type }) => type === "faq")
    .flatMap(({ items }) => items)
    .filter(({ status }) => status === "validated");
  if (validatedFaq.length > 0) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: validatedFaq.map(({ answer, question }) => ({
        "@type": "Question",
        acceptedAnswer: { "@type": "Answer", text: answer },
        name: question,
      })),
    });
  }

  return `<script type="application/ld+json">${safeJson({
    "@context": "https://schema.org",
    "@graph": graph,
  })}</script>`;
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
    .map((section) => renderSection(section, { locale, siteData }))
    .join("");

  return `<!doctype html>
<html lang="${locale}" data-build-mode="${siteData.mode}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.metaDescription)}">
    <meta name="robots" content="${robots}">
    <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
    <link rel="alternate" hreflang="de" href="${escapeHtml(`${siteData.baseUrl}${route.paths.de}`)}">
    <link rel="alternate" hreflang="fr" href="${escapeHtml(`${siteData.baseUrl}${route.paths.fr}`)}">
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(defaultUrl)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Residenz Aureum">
    <meta property="og:title" content="${escapeHtml(page.title)}">
    <meta property="og:description" content="${escapeHtml(page.metaDescription)}">
    <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
    <meta property="og:locale" content="${locale === "de" ? "de_DE" : "fr_FR"}">
    <meta property="og:locale:alternate" content="${locale === "de" ? "fr_FR" : "de_DE"}">
    <meta name="twitter:card" content="summary">
    ${renderAssetLinks(assets)}
    ${structuredDataForPage({ locale, page, route, siteData })}
  </head>
  <body data-locale="${locale}">
    <a class="skip-link" href="#main-content">${escapeHtml(localeLabels.skip)}</a>
    <header class="site-header">
      <div class="shell header-inner">
        <a class="brand" href="${escapeHtml(siteData.routes.find(({ id }) => id === "home").paths[locale])}" aria-label="${escapeHtml(localeLabels.brandLabel)}">
          <span aria-hidden="true">A</span>
          <strong>Residenz Aureum</strong>
        </a>
        ${renderNavigation({
          activeRouteId: route.id,
          locale,
          localizedContent: siteData.localizedContent,
          routes: siteData.routes,
        })}
        <a class="language-link" href="${escapeHtml(route.paths[alternateLocale])}" lang="${alternateLocale}" hreflang="${alternateLocale}" data-language-choice>${escapeHtml(localeLabels.alternate)}</a>
      </div>
    </header>
    ${renderBreadcrumbs({ locale, page, route, siteData })}
    <main id="main-content" tabindex="-1">
      ${
        page.state === "draft"
          ? `<p class="draft-notice" role="status">${escapeHtml(localeLabels.draft)}</p>`
          : ""
      }
      <section class="page-hero">
        <div class="shell hero-layout">
          <div class="measure">
            <p class="eyebrow">${escapeHtml(page.eyebrow)}</p>
            <h1>${escapeHtml(page.heading)}</h1>
            <p class="lead">${escapeHtml(page.intro)}</p>
            ${
              page.primaryCta
                ? `<a class="button" href="${escapeHtml(page.primaryCta.href)}">${escapeHtml(page.primaryCta.label)}</a>`
                : ""
            }
          </div>
          ${renderMedia({
            context: "hero",
            locale,
            mediaId: page.heroMediaId,
            siteData,
            title: page.heading,
          })}
        </div>
      </section>
      ${sections}
    </main>
    ${renderFooter({
      copyrightYear: siteData.copyrightYear,
      locale,
      organization: siteData.organization,
      routes: siteData.routes,
    })}
  </body>
</html>`;
}

export function renderRootPage({ assets, siteData }) {
  const deHome = siteData.routes.find(({ id }) => id === "home").paths.de;
  const frHome = siteData.routes.find(({ id }) => id === "home").paths.fr;
  const canonical = `${siteData.baseUrl}/`;
  const title = "Residenz Aureum | Sprache wählen";
  const description =
    "Wählen Sie Deutsch oder Français, um die Website der Residenz Aureum zu besuchen.";

  return `<!doctype html>
<html lang="de" data-build-mode="${siteData.mode}">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta name="robots" content="${siteData.mode === "preview" ? "noindex, nofollow" : "index, follow"}">
    <link rel="canonical" href="${escapeHtml(canonical)}">
    <link rel="alternate" hreflang="de" href="${escapeHtml(`${siteData.baseUrl}${deHome}`)}">
    <link rel="alternate" hreflang="fr" href="${escapeHtml(`${siteData.baseUrl}${frHome}`)}">
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(canonical)}">
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="Residenz Aureum">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:url" content="${escapeHtml(canonical)}">
    <meta property="og:locale" content="de_DE">
    <meta property="og:locale:alternate" content="fr_FR">
    <meta name="twitter:card" content="summary">
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
          <a class="button" href="${escapeHtml(deHome)}" lang="de" data-language-choice>Deutsch</a>
          <a class="button button-secondary" href="${escapeHtml(frHome)}" lang="fr" data-language-choice>Français</a>
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
    <title>${escapeHtml(copy.title)}</title>
    <meta name="description" content="${escapeHtml(copy.description)}">
    <meta name="robots" content="noindex, follow">
    ${renderAssetLinks(assets)}
  </head>
  <body>
    <a class="skip-link" href="#main-content">${escapeHtml(labels[locale].skip)}</a>
    <main id="main-content" class="language-gateway" tabindex="-1">
      <div class="measure">
        <p class="eyebrow">404</p>
        <h1>${escapeHtml(copy.heading)}</h1>
        <p>${escapeHtml(copy.description)}</p>
        <a class="button" href="${escapeHtml(home)}">${escapeHtml(copy.home)}</a>
      </div>
    </main>
  </body>
</html>`;
}

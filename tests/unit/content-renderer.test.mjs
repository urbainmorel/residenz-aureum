import assert from "node:assert/strict";
import test from "node:test";
import { collectHtmlIds } from "../../scripts/audit-accessibility.mjs";
import {
  collectMockInventory,
  loadSiteData,
} from "../../scripts/lib/site-data.mjs";
import { renderLocalizedPage } from "../../src/templates/layout.mjs";

const assets = {
  script: "/assets/app-test.js",
  styles: ["/assets/app-test.css"],
};

const trackedFeature = {
  body: "Une explication suffisamment détaillée pour ce bloc de démonstration.",
  status: "mock",
  title: "Repère provisoire",
};

const page = {
  eyebrow: "Contact",
  heading: "Parlons de votre projet",
  heroMediaId: "hero-garden-a",
  intro:
    "Une introduction suffisamment longue pour présenter clairement cette page de test.",
  metaDescription:
    "Une description de test unique et suffisamment longue pour contrôler le rendu des métadonnées.",
  sections: [
    {
      body: ["Un paragraphe éditorial complet, présent dans le HTML initial."],
      heading: "Présentation",
      id: "presentation",
      mediaId: "common-lounge-a",
      type: "prose",
    },
    {
      heading: "Bénéfices",
      id: "benefices",
      intro: "Une introduction claire aux bénéfices de démonstration.",
      items: [trackedFeature, { ...trackedFeature, title: "Second repère" }],
      type: "features",
    },
    {
      heading: "Chiffres",
      id: "chiffres",
      intro: "Des chiffres fictifs clairement présentés comme tels.",
      items: [
        { label: "Exemple", status: "mock", value: "24 h" },
        { label: "Autre exemple", status: "mock", value: "7 j" },
      ],
      type: "stats",
    },
    {
      heading: "Étapes",
      id: "etapes",
      intro: "Deux étapes qui restent entièrement consultables.",
      items: [trackedFeature, { ...trackedFeature, title: "Deuxième étape" }],
      type: "steps",
    },
    {
      heading: "Galerie",
      id: "galerie",
      intro: "Des médias sémantiques en attente de leur validation.",
      items: [
        {
          caption: "Une légende suffisamment longue pour le premier visuel.",
          mediaId: "room-b",
          status: "mock",
          title: "Chambre",
        },
        {
          caption: "Une légende suffisamment longue pour le second visuel.",
          mediaId: "garden-a",
          status: "mock",
          title: "Jardin",
        },
      ],
      type: "gallery",
    },
    {
      heading: "Témoignages",
      id: "temoignages",
      intro: "Des paroles fictives affichées avec leur signalement.",
      items: [
        {
          context: "Profil fictif",
          name: "Marie Exemple",
          quote:
            "Un témoignage entièrement fictif et assez long pour éprouver le rendu.",
          status: "mock",
        },
        {
          context: "Profil fictif",
          name: "Jean Exemple",
          quote:
            "Un second témoignage entièrement fictif utilisé uniquement en démonstration.",
          status: "mock",
        },
      ],
      type: "testimonials",
    },
    {
      heading: "Preuves",
      id: "preuves",
      intro: "Des preuves génériques sans marque ou certification réelle.",
      items: [trackedFeature, { ...trackedFeature, title: "Preuve générique" }],
      type: "trustProofs",
    },
    {
      heading: "Questions",
      id: "questions",
      intro:
        "Des réponses accessibles même lorsque JavaScript est indisponible.",
      items: [
        {
          answer:
            "Cette réponse validée peut être incluse dans les données structurées.",
          approvalRef: "https://example.com/approval/faq-1",
          question: "Une question validée ?",
          status: "validated",
        },
        {
          answer:
            "Cette réponse fictive doit rester absente des données structurées.",
          question: "Une question provisoire ?",
          status: "mock",
        },
      ],
      type: "faq",
    },
    {
      heading: "Guides",
      id: "guides",
      intro: "Cinq guides complets directement consultables dans la page.",
      items: Array.from({ length: 5 }, (_, index) => ({
        body: [
          "Premier paragraphe détaillé du guide, visible sans interaction avec le navigateur.",
          "Deuxième paragraphe détaillé du guide, visible sans interaction avec le navigateur.",
          "Troisième paragraphe détaillé du guide, visible sans interaction avec le navigateur.",
        ],
        checklist: ["Premier point", "Deuxième point", "Troisième point"],
        slug: `guide-${index + 1}`,
        summary:
          "Un résumé complet qui présente la finalité pratique de ce mini-guide.",
        title: `Mini-guide numéro ${index + 1}`,
        updatedAt: "2026-07-28",
      })),
      type: "guides",
    },
    {
      fields: [
        {
          autocomplete: "given-name",
          label: "Prénom",
          name: "firstName",
          required: true,
          type: "text",
        },
        {
          autocomplete: "family-name",
          label: "Nom",
          name: "lastName",
          required: true,
          type: "text",
        },
        {
          autocomplete: "email",
          label: "E-mail",
          name: "email",
          required: true,
          type: "email",
        },
        {
          autocomplete: "tel",
          label: "Téléphone",
          name: "phone",
          required: false,
          type: "tel",
        },
        {
          label: "Date souhaitée",
          name: "preferredDate",
          required: false,
          type: "date",
        },
        {
          label: "Contact préféré",
          name: "preferredContact",
          options: [
            { label: "E-mail", value: "email" },
            { label: "Téléphone", value: "phone" },
            { label: "Sans préférence", value: "none" },
          ],
          required: true,
          type: "select",
        },
        {
          label: "Message",
          name: "message",
          required: true,
          type: "textarea",
        },
        {
          label: "J’accepte le traitement de mes données.",
          name: "privacyAccepted",
          required: true,
          type: "checkbox",
        },
      ],
      healthWarning:
        "Ne transmettez aucune donnée médicale ou information sensible dans ce formulaire.",
      heading: "Demande de contact",
      id: "demande",
      intentOptions: [
        { label: "Question générale", value: "general" },
        { label: "Demande de visite", value: "visit" },
      ],
      intro: "Choisissez le motif de votre demande et complétez les champs.",
      privacyLabel:
        "J’accepte que mes informations soient utilisées pour répondre à ma demande.",
      submitLabel: "Envoyer la demande",
      successMessage:
        "Votre demande a bien été transmise. Nous vous répondrons prochainement.",
      type: "contactForm",
    },
    {
      body: "Une dernière invitation claire à prendre contact avec notre équipe.",
      heading: "Préparer une visite",
      href: "/fr/contact-visite/#demande",
      id: "appel",
      label: "Demander une visite",
      type: "cta",
    },
  ],
  state: "draft",
  title: "Contact de test | Residenz Aureum",
};

const routes = [
  {
    id: "home",
    navigation: 0,
    paths: { de: "/de/", fr: "/fr/" },
  },
  {
    id: "contact",
    navigation: 10,
    paths: { de: "/de/kontakt-besichtigung/", fr: "/fr/contact-visite/" },
  },
  {
    id: "legal",
    navigation: null,
    paths: { de: "/de/impressum/", fr: "/fr/mentions-legales/" },
  },
  {
    id: "privacy",
    navigation: null,
    paths: { de: "/de/datenschutz/", fr: "/fr/confidentialite/" },
  },
];

const organization = {
  contact: {
    address: {
      city: "Mülheim an der Ruhr",
      country: "Deutschland",
      postalCode: "00000",
      street: "Musterstraße 00",
    },
    email: "kontakt-demo@example.invalid",
    openingHours: [{ days: "Montag bis Freitag", hours: "09:00–17:00 Uhr" }],
    phoneDisplay: "+49 000 000000",
    phoneHref: "+490000000",
    status: "mock",
  },
  name: "Residenz Aureum",
};

const localizedContent = {
  de: {
    pages: Object.fromEntries(
      routes.map((route) => [
        route.id,
        { title: `${route.id} DE | Residenz Aureum` },
      ]),
    ),
  },
  fr: {
    pages: Object.fromEntries(
      routes.map((route) => [
        route.id,
        { title: `${route.id} FR | Residenz Aureum` },
      ]),
    ),
  },
};

const siteData = {
  baseUrl: "https://residenz-aureum.com",
  copyrightYear: 2026,
  defaultLocale: "de",
  localizedContent,
  mediaById: {},
  mode: "preview",
  organization,
  routes,
};

test("le renderer couvre tous les blocs et conserve leur contenu sans JavaScript", () => {
  const route = routes.find(({ id }) => id === "contact");
  const html = renderLocalizedPage({
    assets,
    locale: "fr",
    page,
    route,
    siteData,
  });

  for (const type of [
    "prose",
    "features",
    "stats",
    "steps",
    "gallery",
    "testimonials",
    "trustProofs",
    "faq",
    "guides",
    "contact-form",
    "cta",
  ]) {
    assert.match(html, new RegExp(`section-${type}`));
  }

  assert.match(html, /data-faq-toggle/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /Cette réponse fictive/);
  assert.match(html, /id="guide-5"/);
  assert.doesNotMatch(html, /<details/);
});

test("les mocks sont signalés mais exclus des données structurées", () => {
  const route = routes.find(({ id }) => id === "contact");
  const html = renderLocalizedPage({
    assets,
    locale: "fr",
    page,
    route,
    siteData,
  });
  const germanHtml = renderLocalizedPage({
    assets,
    locale: "de",
    page,
    route,
    siteData,
  });
  const jsonLd = html.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/,
  )?.[1];

  assert.match(html, /Contenu provisoire de démonstration/);
  assert.match(germanHtml, /Vorläufiger Demo-Inhalt/);
  assert.match(html, /data-status="mock"/);
  assert.ok(jsonLd);
  assert.match(jsonLd, /Une question validée/);
  assert.doesNotMatch(jsonLd, /Une question provisoire/);
  assert.doesNotMatch(jsonLd, /provisoire de démonstration/);
  assert.doesNotMatch(jsonLd, /"status":"mock"/);
});

test("le formulaire expose les champs STI et les aides accessibles", () => {
  const route = routes.find(({ id }) => id === "contact");
  const html = renderLocalizedPage({
    assets,
    locale: "fr",
    page,
    route,
    siteData,
  });

  for (const name of [
    "submissionId",
    "locale",
    "intent",
    "firstName",
    "lastName",
    "email",
    "phone",
    "preferredContact",
    "preferredDate",
    "message",
    "privacyAccepted",
    "company",
    "formStartedAt",
  ]) {
    assert.match(html, new RegExp(`name="${name}"`));
  }

  assert.match(html, /action="\/api\/contact"/);
  assert.match(html, /role="alert" tabindex="-1" hidden data-form-errors/);
  assert.match(html, /role="status" aria-live="polite" hidden/);
  assert.match(html, /Aucune donnée médicale|aucune donnée médicale/i);
});

test("les mediaId non intégrés restent des placeholders sans chemin public", () => {
  const route = routes.find(({ id }) => id === "contact");
  const html = renderLocalizedPage({
    assets,
    locale: "fr",
    page,
    route,
    siteData,
  });

  assert.match(
    html,
    /<figure class="media-placeholder"[^>]+data-media-id="hero-garden-a"/,
  );
  assert.match(html, /data-media-id="room-b"/);
  assert.doesNotMatch(html, /assets\/media\/candidates/);
  assert.doesNotMatch(html, /\/media\/preview\//);
});

test("l’inventaire retrouve chaque objet mock avec son chemin", () => {
  const inventory = collectMockInventory(
    {
      items: [
        { status: "mock", title: "A" },
        { approvalRef: "issue://42", status: "validated", title: "B" },
      ],
    },
    ["fr", "home"],
  );

  assert.deepEqual(inventory, [
    { path: "fr.home.items.0", type: "tracked-content" },
  ]);
});

test("l’audit des identifiants ignore data-media-id", () => {
  const html =
    '<main id="main-content"><figure data-media-id="room-b"></figure><div id="room-b"></div></main>';

  assert.deepEqual(collectHtmlIds(html), ["main-content", "room-b"]);
});

test("chaque fragment de CTA cible une section réelle de la page localisée", async () => {
  const loaded = await loadSiteData({ mode: "preview" });

  for (const locale of loaded.locales) {
    for (const route of loaded.routes) {
      const localizedPage = loaded.localizedContent[locale].pages[route.id];
      const hrefs = [
        localizedPage.primaryCta.href,
        ...localizedPage.sections
          .filter(({ type }) => type === "cta")
          .map(({ href }) => href),
      ];

      for (const href of hrefs) {
        const url = new URL(href, "https://validation.invalid");
        const targetRoute = loaded.routes.find(
          (candidate) => candidate.paths[locale] === url.pathname,
        );

        assert.ok(targetRoute, `${locale}:${route.id} cible ${href}`);
        if (!url.hash) {
          continue;
        }

        const targetIds = loaded.localizedContent[locale].pages[
          targetRoute.id
        ].sections.map(({ id }) => id);
        assert.ok(
          targetIds.includes(decodeURIComponent(url.hash.slice(1))),
          `${locale}:${route.id} cible le fragment ${href}`,
        );
      }
    }
  }
});

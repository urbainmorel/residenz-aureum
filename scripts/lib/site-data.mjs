import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const CONTENT_FILES = {
  de: "src/content/de/pages.json",
  fr: "src/content/fr/pages.json",
};

const MEDIA_FILES = {
  register: "assets/media/ai-assets.json",
  schema: "schemas/media.schema.json",
};

const EXPECTED_CONTACT_FIELDS = [
  "email",
  "firstName",
  "lastName",
  "message",
  "phone",
  "preferredContact",
  "preferredDate",
  "privacyAccepted",
];

async function readJson(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    throw new Error(`Impossible de lire ${path}: ${error.message}`, {
      cause: error,
    });
  }
}

function formatAjvErrors(errors = []) {
  return errors
    .map(({ instancePath, message }) => `${instancePath || "/"} ${message}`)
    .join("; ");
}

function assertUnique(values, label) {
  const duplicates = values.filter(
    (value, index) => values.indexOf(value) !== index,
  );

  if (duplicates.length > 0) {
    throw new Error(
      `${label}: doublons détectés (${[...new Set(duplicates)]})`,
    );
  }
}

function collectMediaReferences(value) {
  if (Array.isArray(value)) {
    return value.flatMap(collectMediaReferences);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    ["heroMediaId", "mediaId"].includes(key)
      ? [child]
      : collectMediaReferences(child),
  );
}

function publicPathFor(path) {
  return `/${path.replace(/^public\//, "")}`;
}

function buildMediaIndex({ assets, localizedContent, mode }) {
  const bases = assets.filter(
    ({ selected, variantOf }) => selected && variantOf === null,
  );
  const baseById = new Map(bases.map((asset) => [asset.id, asset]));
  const references = [
    ...new Set(Object.values(localizedContent).flatMap(collectMediaReferences)),
  ];
  const missing = references.filter((id) => !baseById.has(id));
  if (missing.length > 0) {
    throw new Error(
      `Références médias absentes du registre: ${missing.join(", ")}.`,
    );
  }

  if (mode === "production") {
    const unapproved = references.filter((id) => {
      const asset = baseById.get(id);
      return asset.approvalStatus !== "approved" || !asset.approvalReference;
    });
    if (unapproved.length > 0) {
      throw new Error(
        `Build production bloqué: médias non approuvés (${unapproved.join(", ")}).`,
      );
    }
  }

  const deliveryPrefix =
    mode === "preview" ? "public/media/preview/" : "public/media/";
  return Object.fromEntries(
    bases.map((base) => {
      const delivered = assets.filter(
        ({ path, variantOf }) =>
          variantOf === base.id && path.startsWith(deliveryPrefix),
      );
      const asVariant = (asset) => ({
        height: asset.height,
        publicPath: publicPathFor(asset.path),
        src: publicPathFor(asset.path),
        width: asset.width,
      });
      const variants = delivered
        .filter(({ format }) => format === "landscape")
        .sort((left, right) => left.width - right.width)
        .map(asVariant);
      const portraitVariants = delivered
        .filter(({ format }) => format === "portrait")
        .sort((left, right) => left.width - right.width)
        .map(asVariant);

      if (variants.length === 0) {
        throw new Error(
          `${base.id}: aucune variante ${mode} livrable dans le registre.`,
        );
      }

      return [
        base.id,
        {
          alt: base.alt,
          approvalReference: base.approvalReference,
          approvalStatus: base.approvalStatus,
          focalPoint: base.focalPoint,
          id: base.id,
          portraitVariants,
          previewOnly: mode === "preview",
          representsResidence: base.representsResidence,
          scene: base.scene,
          variants,
        },
      ];
    }),
  );
}

function assertPageCoverage(routes, localizedContent) {
  const routeIds = routes.map(({ id }) => id);

  for (const [locale, content] of Object.entries(localizedContent)) {
    const pageIds = Object.keys(content.pages);
    const missing = routeIds.filter((id) => !pageIds.includes(id));
    const orphaned = pageIds.filter((id) => !routeIds.includes(id));

    if (missing.length > 0 || orphaned.length > 0) {
      throw new Error(
        `Couverture ${locale} invalide. Manquantes: ${missing.join(", ") || "aucune"}; orphelines: ${orphaned.join(", ") || "aucune"}.`,
      );
    }

    assertUnique(
      pageIds.map((id) => content.pages[id].title),
      `Titres ${locale}`,
    );
    assertUnique(
      pageIds.map((id) => content.pages[id].metaDescription),
      `Meta descriptions ${locale}`,
    );

    for (const [pageId, page] of Object.entries(content.pages)) {
      assertUnique(
        page.sections.map(({ id }) => id),
        `Identifiants de sections ${locale}:${pageId}`,
      );

      const localizedHrefs = [
        page.primaryCta.href,
        ...page.sections
          .filter(({ type }) => type === "cta")
          .map(({ href }) => href),
      ];
      const foreignHrefs = localizedHrefs.filter(
        (href) => !href.startsWith(`/${locale}/`),
      );
      if (foreignHrefs.length > 0) {
        throw new Error(
          `CTA ${locale}:${pageId}: liens hors locale (${foreignHrefs.join(", ")}).`,
        );
      }

      for (const href of localizedHrefs) {
        const url = new URL(href, "https://validation.invalid");
        const targetRoute = routes.find(
          (candidate) => candidate.paths[locale] === url.pathname,
        );

        if (!targetRoute) {
          throw new Error(
            `CTA ${locale}:${pageId}: route interne introuvable (${href}).`,
          );
        }

        if (url.hash) {
          const fragment = decodeURIComponent(url.hash.slice(1));
          const targetIds = localizedContent[locale].pages[
            targetRoute.id
          ].sections.map(({ id }) => id);

          if (!targetIds.includes(fragment)) {
            throw new Error(
              `CTA ${locale}:${pageId}: fragment interne introuvable (${href}).`,
            );
          }
        }
      }

      for (const section of page.sections) {
        if (section.type === "guides") {
          assertUnique(
            section.items.map(({ slug }) => slug),
            `Slugs de guides ${locale}:${pageId}:${section.id}`,
          );
        }

        if (section.type === "contactForm") {
          const fieldNames = section.fields
            .map(({ name }) => name)
            .sort((left, right) => left.localeCompare(right));
          assertUnique(
            fieldNames,
            `Champs de formulaire ${locale}:${pageId}:${section.id}`,
          );
          if (
            JSON.stringify(fieldNames) !==
            JSON.stringify(EXPECTED_CONTACT_FIELDS)
          ) {
            throw new Error(
              `Formulaire ${locale}:${pageId}:${section.id}: les huit champs STI sont obligatoires.`,
            );
          }

          const intents = section.intentOptions
            .map(({ value }) => value)
            .sort((left, right) => left.localeCompare(right));
          if (
            JSON.stringify(intents) !== JSON.stringify(["general", "visit"])
          ) {
            throw new Error(
              `Formulaire ${locale}:${pageId}:${section.id}: intents attendus general et visit.`,
            );
          }

          const preferredContact = section.fields.find(
            ({ name }) => name === "preferredContact",
          );
          const preferredValues = preferredContact.options
            .map(({ value }) => value)
            .sort((left, right) => left.localeCompare(right));
          if (
            JSON.stringify(preferredValues) !==
            JSON.stringify(["email", "none", "phone"])
          ) {
            throw new Error(
              `Formulaire ${locale}:${pageId}:${section.id}: preferredContact doit proposer email, phone et none.`,
            );
          }
        }
      }
    }
  }

  for (const route of routes) {
    const deTypes = localizedContent.de.pages[route.id].sections.map(
      ({ type }) => type,
    );
    const frTypes = localizedContent.fr.pages[route.id].sections.map(
      ({ type }) => type,
    );
    if (JSON.stringify(deTypes) !== JSON.stringify(frTypes)) {
      throw new Error(
        `Structure bilingue incohérente pour ${route.id}: ${deTypes.join(",")} / ${frTypes.join(",")}.`,
      );
    }
  }
}

export function collectMockInventory(value, path = []) {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      collectMockInventory(item, [...path, String(index)]),
    );
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const own =
    value.status === "mock"
      ? [
          {
            path: path.join("."),
            type: value.type || "tracked-content",
          },
        ]
      : [];

  return [
    ...own,
    ...Object.entries(value)
      .filter(([key]) => key !== "status")
      .flatMap(([key, child]) => collectMockInventory(child, [...path, key])),
  ];
}

export async function loadSiteData({
  mode = "preview",
  projectRoot = process.cwd(),
} = {}) {
  if (!["preview", "production"].includes(mode)) {
    throw new Error(`Mode de build inconnu: ${mode}`);
  }

  const routeSchema = await readJson(
    resolve(projectRoot, "schemas/routes.schema.json"),
  );
  const pageSchema = await readJson(
    resolve(projectRoot, "schemas/pages.schema.json"),
  );
  const organizationSchema = await readJson(
    resolve(projectRoot, "schemas/organization.schema.json"),
  );
  const mediaSchema = await readJson(resolve(projectRoot, MEDIA_FILES.schema));
  const mediaRegister = await readJson(
    resolve(projectRoot, MEDIA_FILES.register),
  );
  const routes = await readJson(resolve(projectRoot, "src/data/routes.json"));
  const organization = await readJson(
    resolve(projectRoot, "src/data/organization.json"),
  );
  const localizedContent = Object.fromEntries(
    await Promise.all(
      Object.entries(CONTENT_FILES).map(async ([locale, path]) => [
        locale,
        await readJson(resolve(projectRoot, path)),
      ]),
    ),
  );

  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);

  const validateRoutes = ajv.compile(routeSchema);
  if (!validateRoutes(routes)) {
    throw new Error(
      `Manifest de routes invalide: ${formatAjvErrors(validateRoutes.errors)}`,
    );
  }

  const validatePages = ajv.compile(pageSchema);
  for (const [locale, content] of Object.entries(localizedContent)) {
    if (!validatePages(content)) {
      throw new Error(
        `Contenu ${locale} invalide: ${formatAjvErrors(validatePages.errors)}`,
      );
    }
    if (content.locale !== locale) {
      throw new Error(
        `Le fichier ${locale} déclare la locale ${content.locale}.`,
      );
    }
  }

  const validateOrganization = ajv.compile(organizationSchema);
  if (!validateOrganization(organization)) {
    throw new Error(
      `Données d’organisation invalides: ${formatAjvErrors(validateOrganization.errors)}`,
    );
  }

  const validateMedia = ajv.compile(mediaSchema);
  if (!validateMedia(mediaRegister)) {
    throw new Error(
      `Registre médias invalide: ${formatAjvErrors(validateMedia.errors)}`,
    );
  }
  assertUnique(
    mediaRegister.assets.map(({ id }) => id),
    "Identifiants médias",
  );
  assertUnique(
    mediaRegister.assets.map(({ path }) => path),
    "Chemins médias",
  );

  assertUnique(
    routes.routes.map(({ id }) => id),
    "Identifiants de routes",
  );
  assertUnique(
    routes.routes.flatMap(({ paths }) => Object.values(paths)),
    "Chemins de routes",
  );
  assertUnique(
    routes.routes
      .map(({ navigation }) => navigation)
      .filter((value) => value !== null),
    "Ordres de navigation",
  );
  assertPageCoverage(routes.routes, localizedContent);

  const invalidLocalePaths = routes.routes.flatMap(({ id, paths }) =>
    Object.entries(paths)
      .filter(([locale, path]) => !path.startsWith(`/${locale}/`))
      .map(([locale, path]) => `${id}:${locale}:${path}`),
  );
  if (invalidLocalePaths.length > 0) {
    throw new Error(
      `Chemins et locales incohérents: ${invalidLocalePaths.join(", ")}`,
    );
  }

  if (mode === "production") {
    const previewAssets = mediaRegister.assets.filter(
      ({ path, previewOnly }) =>
        previewOnly || path.startsWith("public/media/preview/"),
    );
    if (previewAssets.length > 0) {
      throw new Error(
        "Build production bloqué: des médias de preview sont encore publics.",
      );
    }

    const drafts = Object.entries(localizedContent).flatMap(
      ([locale, content]) =>
        Object.entries(content.pages)
          .filter(([, page]) => page.state !== "ready")
          .map(([id]) => `${locale}:${id}`),
    );

    if (drafts.length > 0) {
      throw new Error(
        `Build production bloqué: contenus non finalisés (${drafts.join(", ")}).`,
      );
    }

    const regulatedMocks = routes.routes.flatMap((route) => {
      if (!route.regulated) {
        return [];
      }

      return Object.entries(localizedContent).flatMap(([locale, content]) =>
        collectMockInventory(content.pages[route.id], [locale, route.id]).map(
          ({ path }) => path,
        ),
      );
    });
    if (regulatedMocks.length > 0) {
      throw new Error(
        `Build production bloqué: données réglementées mock (${regulatedMocks.join(", ")}).`,
      );
    }

    if (organization.contact.status !== "validated") {
      throw new Error(
        "Build production bloqué: les coordonnées opérationnelles sont encore mock.",
      );
    }
  }

  const configuredBaseUrl =
    process.env.PUBLIC_SITE_URL?.trim() || routes.baseUrl;
  let baseUrl;
  try {
    baseUrl = new URL(configuredBaseUrl);
  } catch {
    throw new Error(`PUBLIC_SITE_URL invalide: ${configuredBaseUrl}`);
  }

  if (baseUrl.protocol !== "https:") {
    throw new Error("PUBLIC_SITE_URL doit utiliser HTTPS.");
  }

  return {
    baseUrl: baseUrl.origin,
    copyrightYear: routes.copyrightYear,
    defaultLocale: routes.defaultLocale,
    locales: routes.locales,
    localizedContent,
    mediaById: buildMediaIndex({
      assets: mediaRegister.assets,
      localizedContent,
      mode,
    }),
    mode,
    organization,
    routes: routes.routes,
  };
}

export function routeForPath(siteData, pathname) {
  for (const route of siteData.routes) {
    for (const locale of siteData.locales) {
      if (route.paths[locale] === pathname) {
        return { locale, route };
      }
    }
  }

  return null;
}

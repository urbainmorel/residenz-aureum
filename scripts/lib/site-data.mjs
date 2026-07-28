import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const CONTENT_FILES = {
  de: "src/content/de/pages.json",
  fr: "src/content/fr/pages.json",
};

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
  }
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
  const routes = await readJson(resolve(projectRoot, "src/data/routes.json"));
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
    mode,
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

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  renderLocalizedPage,
  renderNotFoundPage,
  renderRootPage,
} from "../src/templates/layout.mjs";
import { loadSiteData } from "./lib/site-data.mjs";

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function outputPath(clientDirectory, pathname) {
  const relative =
    pathname === "/" ? "index.html" : `${pathname.slice(1)}index.html`;
  return resolve(clientDirectory, relative);
}

async function writePage(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
}

async function loadAssetManifest(clientDirectory) {
  const manifestPath = resolve(clientDirectory, ".vite/manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  const entry = Object.values(manifest).find(({ isEntry }) => isEntry);

  if (!entry) {
    throw new Error(`Aucune entrée Vite trouvée dans ${manifestPath}.`);
  }

  return {
    script: `/${entry.file}`,
    styles: (entry.css || []).map((path) => `/${path}`),
  };
}

function renderSitemap(siteData) {
  const urls = siteData.routes
    .filter(({ indexable }) => indexable)
    .flatMap((route) =>
      siteData.locales.map((locale) => {
        const location = `${siteData.baseUrl}${route.paths[locale]}`;
        const alternates = [
          ...siteData.locales.map(
            (alternateLocale) =>
              `<xhtml:link rel="alternate" hreflang="${alternateLocale}" href="${escapeXml(`${siteData.baseUrl}${route.paths[alternateLocale]}`)}"/>`,
          ),
          `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${siteData.baseUrl}${route.paths[siteData.defaultLocale]}`)}"/>`,
        ].join("");

        return `<url><loc>${escapeXml(location)}</loc>${alternates}</url>`;
      }),
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls}</urlset>\n`;
}

export async function buildPages({ mode, projectRoot = process.cwd() } = {}) {
  const clientDirectory = resolve(projectRoot, "dist/client");
  const siteData = await loadSiteData({ mode, projectRoot });
  const assets = await loadAssetManifest(clientDirectory);

  await writePage(
    outputPath(clientDirectory, "/"),
    renderRootPage({ assets, siteData }),
  );

  for (const route of siteData.routes) {
    for (const locale of siteData.locales) {
      await writePage(
        outputPath(clientDirectory, route.paths[locale]),
        renderLocalizedPage({
          assets,
          locale,
          page: siteData.localizedContent[locale].pages[route.id],
          route,
          siteData,
        }),
      );
    }
  }

  for (const locale of siteData.locales) {
    const notFound = renderNotFoundPage({ assets, locale, siteData });
    await writePage(
      resolve(clientDirectory, locale, "404", "index.html"),
      notFound,
    );
  }
  await writePage(
    resolve(clientDirectory, "404.html"),
    renderNotFoundPage({
      assets,
      locale: siteData.defaultLocale,
      siteData,
    }),
  );

  await writeFile(
    resolve(clientDirectory, "sitemap.xml"),
    renderSitemap(siteData),
    "utf8",
  );
  await writeFile(
    resolve(clientDirectory, "robots.txt"),
    mode === "production"
      ? `User-agent: *\nAllow: /\nSitemap: ${siteData.baseUrl}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n",
    "utf8",
  );

  return {
    pageCount: siteData.routes.length * siteData.locales.length + 4,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const modeIndex = process.argv.indexOf("--mode");
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "preview";
  const result = await buildPages({ mode });
  console.info(`${result.pageCount} documents HTML générés (${mode}).`);
}

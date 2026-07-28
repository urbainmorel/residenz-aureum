import { readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { walkFiles } from "./lib/files.mjs";

function firstMatch(content, expression) {
  return content.match(expression)?.[1]?.trim() || "";
}

function allMatches(content, expression) {
  return [...content.matchAll(expression)].map((match) => match[1]);
}

function assertUnique(values, label, errors) {
  const duplicates = values.filter(
    (value, index) => value && values.indexOf(value) !== index,
  );
  if (duplicates.length > 0) {
    errors.push(`${label} dupliqués: ${[...new Set(duplicates)].join(", ")}`);
  }
}

function expectedPathForFile(label) {
  const normalized = label.split(sep).join("/");
  if (normalized === "index.html") {
    return "/";
  }
  return `/${normalized.replace(/index\.html$/, "")}`;
}

function auditStructuredData(html, label, errors) {
  const blocks = allMatches(
    html,
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  const isLocalized = /^(de|fr)[\\/]/.test(label);

  if (isLocalized && blocks.length === 0) {
    errors.push(`${label}: JSON-LD absent`);
  }

  for (const [index, block] of blocks.entries()) {
    try {
      JSON.parse(block);
    } catch {
      errors.push(`${label}: JSON-LD ${index + 1} invalide`);
    }

    if (
      /"status"\s*:\s*"mock"|Contenu provisoire de démonstration|Vorläufiger Demo-Inhalt|data-status/i.test(
        block,
      )
    ) {
      errors.push(`${label}: contenu mock détecté dans le JSON-LD`);
    }
  }
}

export async function auditSeo({ projectRoot = process.cwd() } = {}) {
  const clientDirectory = resolve(projectRoot, "dist/client");
  const htmlFiles = (await walkFiles(clientDirectory)).filter((path) => {
    const label = relative(clientDirectory, path).split(sep).join("/");
    return (
      path.endsWith("index.html") && !/(^|\/)404\/index\.html$/.test(label)
    );
  });
  const errors = [];
  const titles = [];
  const descriptions = [];
  const canonicals = [];

  for (const path of htmlFiles) {
    const html = await readFile(path, "utf8");
    const label = relative(clientDirectory, path);
    const title = firstMatch(html, /<title>([^<]+)<\/title>/);
    const description = firstMatch(
      html,
      /<meta name="description" content="([^"]+)">/,
    );
    const canonical = firstMatch(html, /<link rel="canonical" href="([^"]+)">/);
    const htmlLocale = firstMatch(html, /<html lang="([^"]+)"/);
    const ogTitle = firstMatch(
      html,
      /<meta property="og:title" content="([^"]+)">/,
    );
    const ogDescription = firstMatch(
      html,
      /<meta property="og:description" content="([^"]+)">/,
    );
    const ogUrl = firstMatch(
      html,
      /<meta property="og:url" content="([^"]+)">/,
    );
    const expectedPath = expectedPathForFile(label);
    const expectedLocale = expectedPath.startsWith("/fr/") ? "fr" : "de";

    titles.push(title);
    descriptions.push(description);
    canonicals.push(canonical);

    if (!title || !description || !canonical) {
      errors.push(`${label}: title, description ou canonical absent`);
    }
    if (
      !canonical.startsWith("https://") ||
      !canonical.endsWith(expectedPath)
    ) {
      errors.push(`${label}: canonical incohérent avec ${expectedPath}`);
    }
    if (htmlLocale !== expectedLocale) {
      errors.push(
        `${label}: langue HTML ${htmlLocale || "absente"}, ${expectedLocale} attendue`,
      );
    }
    if (
      ogTitle !== title ||
      ogDescription !== description ||
      ogUrl !== canonical
    ) {
      errors.push(`${label}: métadonnées Open Graph incohérentes`);
    }
    if (!/<meta property="og:type" content="website">/.test(html)) {
      errors.push(`${label}: og:type absent`);
    }
    for (const locale of ["de", "fr", "x-default"]) {
      if (
        !new RegExp(
          `<link rel="alternate" hreflang="${locale}" href="https://[^"]+">`,
        ).test(html)
      ) {
        errors.push(`${label}: hreflang ${locale} absent ou non absolu`);
      }
    }

    auditStructuredData(html, label, errors);
  }

  assertUnique(titles, "Titres", errors);
  assertUnique(descriptions, "Meta descriptions", errors);
  assertUnique(canonicals, "Canoniques", errors);

  const sitemap = await readFile(
    resolve(clientDirectory, "sitemap.xml"),
    "utf8",
  );
  if (!sitemap.includes("<urlset") || !sitemap.includes("hreflang=")) {
    errors.push("sitemap.xml: structure multilingue absente");
  }

  if (errors.length > 0) {
    throw new Error(`Audit SEO échoué:\n${errors.join("\n")}`);
  }

  return { pageCount: htmlFiles.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await auditSeo();
  console.info(`Audit SEO réussi sur ${result.pageCount} pages indexables.`);
}

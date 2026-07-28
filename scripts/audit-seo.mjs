import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { walkFiles } from "./lib/files.mjs";

function firstMatch(content, expression) {
  return content.match(expression)?.[1]?.trim() || "";
}

function assertUnique(values, label, errors) {
  const duplicates = values.filter(
    (value, index) => value && values.indexOf(value) !== index,
  );
  if (duplicates.length > 0) {
    errors.push(`${label} dupliqués: ${[...new Set(duplicates)].join(", ")}`);
  }
}

export async function auditSeo({ projectRoot = process.cwd() } = {}) {
  const clientDirectory = resolve(projectRoot, "dist/client");
  const htmlFiles = (await walkFiles(clientDirectory)).filter(
    (path) =>
      path.endsWith("index.html") &&
      !path.includes(`${resolve(clientDirectory, "de/404")}`) &&
      !path.includes(`${resolve(clientDirectory, "fr/404")}`),
  );
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

    titles.push(title);
    descriptions.push(description);
    canonicals.push(canonical);

    if (!title || !description || !canonical) {
      errors.push(`${label}: title, description ou canonical absent`);
    }
    for (const locale of ["de", "fr", "x-default"]) {
      if (
        !new RegExp(
          `<link rel="alternate" hreflang="${locale}" href="[^"]+">`,
        ).test(html)
      ) {
        errors.push(`${label}: hreflang ${locale} absent`);
      }
    }
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

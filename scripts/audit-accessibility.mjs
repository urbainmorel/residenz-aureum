import { readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { walkFiles } from "./lib/files.mjs";

function countMatches(content, expression) {
  return [...content.matchAll(expression)].length;
}

export async function auditAccessibility({ projectRoot = process.cwd() } = {}) {
  const clientDirectory = resolve(projectRoot, "dist/client");
  const htmlFiles = (await walkFiles(clientDirectory)).filter(
    (path) => extname(path) === ".html",
  );
  const errors = [];

  for (const path of htmlFiles) {
    const html = await readFile(path, "utf8");
    const label = relative(clientDirectory, path);

    if (!/<html\b[^>]*\blang="(?:de|fr)"/.test(html)) {
      errors.push(`${label}: attribut lang absent ou invalide`);
    }
    if (!/<main\b[^>]*id="main-content"/.test(html)) {
      errors.push(`${label}: élément main#main-content absent`);
    }
    if (!/<a\b[^>]*class="skip-link"[^>]*href="#main-content"/.test(html)) {
      errors.push(`${label}: lien d’évitement absent`);
    }
    if (countMatches(html, /<h1\b/g) !== 1) {
      errors.push(`${label}: un seul h1 est requis`);
    }
    if (/<img\b(?![^>]*\balt=)[^>]*>/i.test(html)) {
      errors.push(`${label}: image sans attribut alt`);
    }
    if (
      /<button\b(?![^>]*(?:aria-label|aria-labelledby)=)[^>]*>\s*<\/button>/i.test(
        html,
      )
    ) {
      errors.push(`${label}: bouton sans nom accessible`);
    }
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicateIds.length > 0) {
      errors.push(
        `${label}: identifiants dupliqués (${[...new Set(duplicateIds)].join(", ")})`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(`Audit accessibilité échoué:\n${errors.join("\n")}`);
  }

  return { pageCount: htmlFiles.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await auditAccessibility();
  console.info(
    `Audit accessibilité statique réussi sur ${result.pageCount} pages.`,
  );
}

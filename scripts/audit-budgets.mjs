import { stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { walkFiles } from "./lib/files.mjs";

const KIB = 1024;
const LIMITS = {
  ".css": 80 * KIB,
  ".html": 60 * KIB,
  ".js": 100 * KIB,
};

export async function auditBudgets({ projectRoot = process.cwd() } = {}) {
  const clientDirectory = resolve(projectRoot, "dist/client");
  const files = await walkFiles(clientDirectory);
  const errors = [];

  for (const path of files) {
    const extension = extname(path).toLowerCase();
    const size = (await stat(path)).size;
    const limit = LIMITS[extension];

    if (limit && size > limit) {
      errors.push(
        `${relative(clientDirectory, path)}: ${Math.ceil(size / KIB)} Kio > ${limit / KIB} Kio`,
      );
    }

    if (extension === ".webp") {
      const imageLimit = path.toLowerCase().includes("hero")
        ? 450 * KIB
        : 200 * KIB;
      if (size > imageLimit) {
        errors.push(
          `${relative(clientDirectory, path)}: image de ${Math.ceil(size / KIB)} Kio > ${imageLimit / KIB} Kio`,
        );
      }
    }

    if ([".avif", ".gif", ".jpeg", ".jpg", ".png"].includes(extension)) {
      errors.push(
        `${relative(clientDirectory, path)}: format raster de production interdit`,
      );
    }
  }

  const fonts = files.filter(
    (path) => extname(path).toLowerCase() === ".woff2",
  );
  if (fonts.length > 2) {
    errors.push(`Polices initiales: ${fonts.length} fichiers WOFF2 > 2`);
  }

  if (errors.length > 0) {
    throw new Error(`Budgets de performance dépassés:\n${errors.join("\n")}`);
  }

  return { fileCount: files.length };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await auditBudgets();
  console.info(
    `Budgets statiques respectés sur ${result.fileCount} fichiers de sortie.`,
  );
}

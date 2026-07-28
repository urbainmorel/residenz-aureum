import { existsSync } from "node:fs";
import { access, readFile } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { walkFiles } from "./lib/files.mjs";
import { loadSiteData } from "./lib/site-data.mjs";

const REQUIRED_SOURCE_FILES = [
  ".env.example",
  ".openai/hosting.json",
  "package.json",
  "src/data/routes.json",
  "src/scripts/main.js",
  "src/styles/main.css",
  "src/templates/layout.mjs",
  "vite.config.js",
  "worker/index.js",
  "wrangler.jsonc",
];

async function assertExists(path) {
  try {
    await access(path);
  } catch {
    throw new Error(`Fichier requis absent: ${path}`);
  }
}

export function findUnsafeTrackedEnvironmentFiles(paths) {
  return paths
    .map((path) => path.replaceAll("\\", "/"))
    .filter((path) => {
      const filename = path.split("/").at(-1);
      return (
        filename !== ".env.example" &&
        (filename === ".env" || filename.startsWith(".env."))
      );
    });
}

function listTrackedEnvironmentFiles(projectRoot) {
  if (!existsSync(resolve(projectRoot, ".git"))) {
    return [];
  }

  const result = spawnSync(
    "git",
    [
      "-C",
      projectRoot,
      "ls-files",
      "-z",
      "--",
      ":(glob).env",
      ":(glob).env.*",
      ":(glob)**/.env",
      ":(glob)**/.env.*",
    ],
    {
      encoding: "utf8",
      windowsHide: true,
    },
  );

  if (result.error) {
    throw new Error(
      `Impossible de vérifier les fichiers d’environnement suivis: ${result.error.message}`,
      { cause: result.error },
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `Impossible de vérifier les fichiers d’environnement suivis: ${result.stderr.trim() || `git a retourné ${result.status}`}`,
    );
  }

  return result.stdout.split("\0").filter(Boolean);
}

export async function validateFoundation({
  projectRoot = process.cwd(),
  sourceOnly = false,
} = {}) {
  await Promise.all(
    REQUIRED_SOURCE_FILES.map((path) =>
      assertExists(resolve(projectRoot, path)),
    ),
  );

  const hosting = JSON.parse(
    await readFile(resolve(projectRoot, ".openai/hosting.json"), "utf8"),
  );
  if (hosting.d1 !== "DB" || hosting.r2 !== null) {
    throw new Error(
      ".openai/hosting.json doit déclarer uniquement le binding D1 logique DB.",
    );
  }

  const publicDirectory = resolve(projectRoot, "public");
  let publicFiles = [];
  try {
    publicFiles = await walkFiles(publicDirectory);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  const forbiddenRaster = publicFiles.filter((path) =>
    [".avif", ".gif", ".jpeg", ".jpg", ".png"].includes(
      extname(path).toLowerCase(),
    ),
  );
  if (forbiddenRaster.length > 0) {
    throw new Error(
      `Médias raster publics interdits: ${forbiddenRaster.map((path) => relative(projectRoot, path)).join(", ")}`,
    );
  }

  const unsafeEnvironmentFiles = findUnsafeTrackedEnvironmentFiles(
    listTrackedEnvironmentFiles(projectRoot),
  );
  if (unsafeEnvironmentFiles.length > 0) {
    throw new Error(
      `Fichiers d’environnement suivis non autorisés: ${unsafeEnvironmentFiles.join(", ")}`,
    );
  }

  const siteData = await loadSiteData({ mode: "preview", projectRoot });
  if (siteData.routes.length !== 12) {
    throw new Error(
      `Le manifest doit contenir 12 paires de routes, reçu: ${siteData.routes.length}.`,
    );
  }

  if (!sourceOnly) {
    const clientDirectory = resolve(projectRoot, "dist/client");
    const outputFiles = [
      resolve(clientDirectory, "index.html"),
      resolve(clientDirectory, "404.html"),
      resolve(clientDirectory, "de/index.html"),
      resolve(clientDirectory, "fr/index.html"),
      resolve(clientDirectory, "sitemap.xml"),
      resolve(clientDirectory, "robots.txt"),
      resolve(projectRoot, "dist/server/index.js"),
      resolve(projectRoot, "dist/.openai/hosting.json"),
    ];

    for (const route of siteData.routes) {
      for (const locale of siteData.locales) {
        outputFiles.push(
          resolve(clientDirectory, route.paths[locale].slice(1), "index.html"),
        );
      }
    }

    await Promise.all(outputFiles.map(assertExists));
  }

  return {
    publicFileCount: publicFiles.length,
    routePairs: siteData.routes.length,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sourceOnly = process.argv.includes("--source");
  const result = await validateFoundation({ sourceOnly });
  console.info(
    `Fondation valide: ${result.routePairs} paires de routes, ${result.publicFileCount} fichiers publics contrôlés.`,
  );
}

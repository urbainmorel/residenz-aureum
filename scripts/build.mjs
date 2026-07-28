import { rm } from "node:fs/promises";
import { resolve } from "node:path";
import { build as viteBuild } from "vite";
import { buildPages } from "./build-pages.mjs";
import { buildWorker } from "./build-worker.mjs";
import { validateFoundation } from "./validate-foundation.mjs";
import { loadSiteData } from "./lib/site-data.mjs";

function readMode(argv) {
  const index = argv.indexOf("--mode");
  return index >= 0 ? argv[index + 1] : "production";
}

const mode = readMode(process.argv.slice(2));
const projectRoot = process.cwd();

await loadSiteData({ mode, projectRoot });
await rm(resolve(projectRoot, "dist"), { force: true, recursive: true });
await viteBuild({ mode });
const { pageCount } = await buildPages({ mode, projectRoot });
await buildWorker({ projectRoot });
await validateFoundation({ projectRoot, sourceOnly: false });

console.info(
  `Build ${mode} terminé: ${pageCount} documents HTML et un Worker ESM.`,
);

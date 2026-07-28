import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

export async function buildWorker({ projectRoot = process.cwd() } = {}) {
  const outputDirectory = resolve(projectRoot, "dist/server");
  await mkdir(outputDirectory, { recursive: true });

  await build({
    bundle: true,
    entryPoints: [resolve(projectRoot, "worker/index.js")],
    format: "esm",
    legalComments: "none",
    minify: true,
    outfile: resolve(outputDirectory, "index.js"),
    platform: "browser",
    sourcemap: false,
    target: "es2022",
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildWorker();
  console.info("Worker ESM généré.");
}

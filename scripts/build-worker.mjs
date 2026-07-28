import { cp, mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";

export async function buildWorker({ projectRoot = process.cwd() } = {}) {
  const outputDirectory = resolve(projectRoot, "dist/server");
  const migrationOutput = resolve(projectRoot, "dist/.openai/drizzle");
  await mkdir(outputDirectory, { recursive: true });

  await build({
    bundle: true,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    entryPoints: [resolve(projectRoot, "worker/index.js")],
    format: "esm",
    legalComments: "none",
    minify: true,
    outfile: resolve(outputDirectory, "index.js"),
    platform: "browser",
    sourcemap: false,
    target: "es2022",
  });

  await rm(migrationOutput, { force: true, recursive: true });
  await cp(resolve(projectRoot, "drizzle"), migrationOutput, {
    recursive: true,
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await buildWorker();
  console.info("Worker ESM généré.");
}

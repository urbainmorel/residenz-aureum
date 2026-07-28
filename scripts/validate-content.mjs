import { pathToFileURL } from "node:url";
import { loadSiteData } from "./lib/site-data.mjs";

export async function validateContent({ mode = "preview" } = {}) {
  const siteData = await loadSiteData({ mode });
  return {
    locales: siteData.locales.length,
    routePairs: siteData.routes.length,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const modeIndex = process.argv.indexOf("--mode");
  const mode = modeIndex >= 0 ? process.argv[modeIndex + 1] : "preview";
  const result = await validateContent({ mode });
  console.info(
    `Contenus ${mode} valides: ${result.routePairs} paires, ${result.locales} langues.`,
  );
}

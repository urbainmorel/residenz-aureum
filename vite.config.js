import { resolve } from "node:path";
import { defineConfig } from "vite";
import { mpaDevelopment } from "./build/vite-mpa-plugin.js";
import { sites } from "./build/sites-vite-plugin.js";

export default defineConfig({
  appType: "mpa",
  build: {
    emptyOutDir: true,
    manifest: true,
    outDir: "dist/client",
    rollupOptions: {
      input: {
        app: resolve("src/scripts/main.js"),
      },
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
  plugins: [mpaDevelopment(), sites()],
  publicDir: "public",
});

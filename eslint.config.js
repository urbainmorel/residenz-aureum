import eslint from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      ".generated/**",
      ".wrangler/**",
      "coverage/**",
      "dist/**",
      "node_modules/**",
    ],
  },
  eslint.configs.recommended,
  {
    files: ["**/*.{js,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals: {
        ...globals.browser,
        ...globals.node,
        ExecutionContext: "readonly",
        Fetcher: "readonly",
      },
      sourceType: "module",
    },
    rules: {
      "no-console": ["error", { allow: ["error", "info", "warn"] }],
    },
  },
];

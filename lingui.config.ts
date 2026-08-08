import { defineConfig } from "@lingui/cli";
import { formatter } from "@lingui/format-json";

export default defineConfig({
  // The locale the app's strings are written in.
  sourceLocale: "en",

  // The locales we support
  locales: ["en", "pseudo-LOCALE"],
  pseudoLocale: { locale: "pseudo-LOCALE" },

  catalogs: [
    {
      path: "<rootDir>/src/locales/{locale}",
      include: ["<rootDir>/src"],
      exclude: ["**/*.test.ts", "**/*.test.tsx", "**/e173/**"],
    },
  ],

  // Don't report line numbers in the JSON, they churn too much with source code
  // changes.
  format: formatter({ style: "lingui", lineNumbers: false }),
});

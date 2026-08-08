import { defineConfig, globalIgnores } from "eslint/config";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import lingui from "eslint-plugin-lingui";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default defineConfig([
  globalIgnores([
    "**/dist/",
    "**/node_modules/",
    "coverage/",
    "tools/sacn-server/",
    "src-tauri/target/",
    "src-tauri/gen/",
  ]),
  {
    extends: compat.extends(
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:react/recommended",
      "plugin:react/jsx-runtime",
      "prettier",
    ),

    plugins: {
      "@typescript-eslint": typescriptEslint,
      react,
    },

    languageOptions: {
      globals: {
        ...globals.browser,
      },

      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },

    settings: {
      react: {
        version: "detect",
      },
    },

    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    // Localization rules for the app's UI. See docs/ui-localization.md.
    files: ["src/**/*.tsx"],
    ignores: [
      "**/*.test.tsx",
      "src/test/**",
      "src/features/deviceClassEditor/device3DView/**",
    ],

    plugins: { lingui },

    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },

    rules: {
      "lingui/no-unlocalized-strings": [
        "error",
        {
          useTsTypes: true,

          ignore: [
            // heuristics: strings with no uppercase letters, camelCase,
            // SCREAMING_CASE constants, single letters and unit abbreviations.
            // This produces false negatives, which we accept.
            "^[^A-Z]*$",
            "^[A-Z0-9_]+$",
            "^[a-z][a-zA-Z0-9-]*$",
          ],

          ignoreNames: [
            "className",
            "id",
            "key",
            "type",
            "role",
            "name",
            "htmlFor",
            "href",
            "to",
            "src",
            "style",
            "variant",
            "size",
            "side",
            "align",
            "position",
            "orientation",
            "mode",
            "accept",
            "block",
            "autoComplete",
            "defaultValue",
            // Component.displayName, read by React DevTools, not by a user.
            "displayName",
            { regex: { pattern: "^data-" } },
            { regex: { pattern: "^aria-" } },
          ],

          ignoreFunctions: [
            "cn",
            "cva",
            "clsx",
            "twMerge",
            "console.*",
            "*.getElementById",
            "*.querySelector",
            "*.scrollIntoView",
            "*.addEventListener",
            "*.removeEventListener",
            // We use LocalizedError for errors containing user-visible text.
            "Error",
          ],
        },
      ],
      "lingui/no-expression-in-message": "warn",
      "lingui/t-call-in-function": "error",
      "lingui/no-single-variables-to-translate": "error",
      "lingui/no-trans-inside-trans": "error",
      // lingui/require-explicit-id is buggy and deliberately not enabled, even
      // though we do require explicit IDs. We have our own script that checks
      // it in CI.
    },
  },
]);

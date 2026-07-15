/// <reference types="vitest" />
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import process from "node:process";
import { readFileSync } from "node:fs";
import tailwindcss from "@tailwindcss/vite";
import checker from "vite-plugin-checker";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";
import { execSync } from "child_process";
import {
  uniqueNamesGenerator,
  adjectives,
  colors,
  animals,
} from "unique-names-generator";

const host = process.env.TAURI_DEV_HOST;

const { version: appVersion } = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

// Plugin to handle .fcd files as JSON
function fcdPlugin(): Plugin {
  return {
    name: "vite-plugin-fcd",
    transform(code, id) {
      if (id.endsWith(".fcd")) {
        return {
          code: `export default ${code}`,
          map: null,
        };
      }
    },
  };
}

// Get build information
function getBuildInfo() {
  let gitHash = "unknown";
  try {
    gitHash = execSync("git rev-parse --short HEAD").toString().trim();
  } catch (e) {
    console.warn("Could not get git commit hash:", e);
  }

  const now = new Date();

  // Format date as YYYYMMDDHHMMSS in UTC
  const dateStamp = [
    now.getUTCFullYear(),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
    String(now.getUTCDate()).padStart(2, "0"),
    String(now.getUTCHours()).padStart(2, "0"),
    String(now.getUTCMinutes()).padStart(2, "0"),
    String(now.getUTCSeconds()).padStart(2, "0"),
  ].join("");

  // Generate a random word from combined dictionaries
  const idWord = uniqueNamesGenerator({
    dictionaries: [adjectives, colors, animals],
    length: 1,
    separator: "",
  });

  const buildString = `${dateStamp}-${gitHash}-${idWord}`;

  return {
    buildString,
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __BUILD_STRING__: JSON.stringify(getBuildInfo().buildString),
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  plugins: [
    fcdPlugin(),
    react(),
    svgr(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    tsconfigPaths(),
    checker({ typescript: true }),
  ],
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 5174,
        }
      : undefined,
    watch: {
      // 3. tell Vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    preserveSymlinks: true,
  },
  optimizeDeps: {
    exclude: ["@cpwg-community/delver"],
  },
  test: {
    globals: true,
    setupFiles: "src/test/setup.ts",
    environment: "happy-dom",
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: "modern-compiler",
      },
    },
  },
});

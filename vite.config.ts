/// <reference types="vitest" />
import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

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

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    fcdPlugin(),
    react(),
    tailwindcss(),
    wasm(),
    topLevelAwait(),
    tsconfigPaths(),
    checker({ typescript: true }),
  ],
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

/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// Allow importing .fcd files as JSON
declare module "*.fcd" {
  const value: object;
  export default value;
}

// Build-time constants injected by Vite
declare const __BUILD_STRING__: string;
declare const __APP_VERSION__: string;

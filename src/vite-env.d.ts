/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

// Allow importing .fcd files as JSON
declare module "*.fcd" {
  const value: object;
  export default value;
}

// Translation databases
declare module "*.json?lingui" {
  import type { Messages } from "@lingui/core";
  export const messages: Messages;
}

// Build-time constants injected by Vite
declare const __BUILD_STRING__: string;
declare const __APP_VERSION__: string;

/// <reference types="vite/client" />

// Allow importing .fcd files as JSON
declare module "*.fcd" {
  const value: object;
  export default value;
}

// Build-time constants injected by Vite
declare const __BUILD_STRING__: string;

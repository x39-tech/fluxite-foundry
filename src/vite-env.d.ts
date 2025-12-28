/// <reference types="vite/client" />

// Allow importing .fcd files as JSON
declare module "*.fcd" {
  const value: object;
  export default value;
}

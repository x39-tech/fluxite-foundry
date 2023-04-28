import { Plugin, defineConfig } from "vite";
import { createHash } from "crypto";
import react from "@vitejs/plugin-react-swc";
import { dataToEsm } from "@rollup/pluginutils";
import tsconfigPaths from "vite-tsconfig-paths";
import { createGenerator } from "ts-json-schema-generator";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tsconfigPaths(), projectCustomImports()],
});

const UDR_DOCUMENT_SCHEMA_ID = "virtual:udrDocumentSchema";
const ROOT_STATE_HASH_ID = "virtual:rootStateHash";

function projectCustomImports(): Plugin {
  return {
    name: "udr-builder-custom-imports",
    enforce: "pre",
    async resolveId(source: string, importer: any, options: any) {
      if (source.startsWith("virtual:")) {
        return source;
      }
      return null;
    },
    load(id: string) {
      if (id == UDR_DOCUMENT_SCHEMA_ID) {
        const config = {
          path: "src/udr/objects/document.ts",
          tsconfig: "tsconfig.json",
          type: "Document",
        };

        const schema = createGenerator(config).createSchema(config.type);
        return dataToEsm(schema);
      } else if (id == ROOT_STATE_HASH_ID) {
        const config = {
          path: "src/app/rootState.ts",
          tsconfig: "tsconfig.json",
          type: "RootState",
        };
        const schemaHash = createHash("sha256")
          .update(
            JSON.stringify(createGenerator(config).createSchema(config.type))
          )
          .digest("hex");
        return `export default "${schemaHash}";`;
      }
      return null;
    },
  };
}

import fs from "fs/promises";
import { constants as fsconstants } from "fs";
import { Plugin, defineConfig } from "vite";
import { createHash } from "crypto";
import react from "@vitejs/plugin-react-swc";
import eslint from "vite-plugin-eslint";
import checker from "vite-plugin-checker";
import tsconfigPaths from "vite-tsconfig-paths";
import { createGenerator } from "ts-json-schema-generator";
import { compile as compileToTS } from "json-schema-to-typescript";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    eslint(),
    tsconfigPaths(),
    projectCustomImports(),
    checker({ typescript: true }),
  ],
});

const ROOT_STATE_HASH_ID = "virtual:rootStateHash";

function projectCustomImports(): Plugin {
  return {
    name: "udr-builder-custom-imports",
    enforce: "pre",
    async buildStart() {
      await generateUdrDocumentTypes();
    },
    async resolveId(source: string) {
      if (source.startsWith("virtual:")) {
        return source;
      }
      return null;
    },
    load(id: string) {
      if (id == ROOT_STATE_HASH_ID) {
        const config = {
          path: "src/app/rootState.ts",
          tsconfig: "tsconfig.json",
          type: "RootState",
        };
        const schemaHash = createHash("sha256")
          .update(
            JSON.stringify(createGenerator(config).createSchema(config.type)),
          )
          .digest("hex");
        return `export default "${schemaHash}";`;
      }
      return null;
    },
  };
}

async function generateUdrDocumentTypes() {
  // Generate a TypeScript file for each E1.73 schema that we have
  const schemasPath = "src/e173/schemas";
  const dir = await fs.opendir(schemasPath);
  for await (const dirent of dir) {
    if (dirent.isDirectory()) {
      const schemaFilePath = `${schemasPath}/${dirent.name}/full/udr-document.json`;

      try {
        await fs.access(schemaFilePath, fsconstants.R_OK);
      } catch {
        continue;
      }

      const outputDir = `src/generated/${dirent.name}`;
      await fs.mkdir(outputDir, { recursive: true });
      const outputPath = `${outputDir}/udr-document.ts`;

      await fs.writeFile(outputPath, await udrDocumentToTS(schemaFilePath));
    }
  }
}

async function udrDocumentToTS(docPath: string) {
  const schema = JSON.parse(await fs.readFile(docPath, "utf8"));
  addEnumTypeNames(schema);

  return await compileToTS(schema, "UDRDocument", {
    enableConstEnums: false,
  });
}

// json-schema-to-typescript will only generate TS string enums for
// enumerated JSON schema items if you add the 'tsEnumNames' key
// alongside 'enum' in the schema. This function artificially adds
// those names, converting kebab-case to UPPER_CASE.
function addEnumTypeNames(obj: object): void {
  if (typeof obj !== "object" || obj === null) {
    return;
  }

  Object.keys(obj).forEach((key) => {
    if (
      key === "enum" &&
      Array.isArray(obj["enum"]) &&
      "type" in obj &&
      obj.type === "string"
    ) {
      const enumNames = obj["enum"] as string[];
      obj["tsEnumNames"] = enumNames.map((value) =>
        value.replace(/-/g, "_").toUpperCase(),
      );
    } else {
      addEnumTypeNames(obj[key]);
    }
  });
}

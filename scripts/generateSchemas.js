const crypto = require("crypto");
const fs = require("fs");
const tsj = require("ts-json-schema-generator");

const outputDir = "src/generated";

function createSchema(file, type) {
  const config = {
    path: file,
    tsconfig: "tsconfig.json",
    type: type,
  };

  const outputPath = outputDir + "/" + type + "Schema.json";

  const schema = tsj.createGenerator(config).createSchema(config.type);
  const schemaString = JSON.stringify(schema, null, 2);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFile(outputPath, schemaString, (err) => {
    if (err) throw err;
  });

  return crypto.createHash("sha256").update(schemaString).digest("hex");
}

const schemaHash = createSchema("src/app/rootState.ts", "RootState");
createSchema("src/udr/objects/document.ts", "Document");

fs.writeFile(
  outputDir + "/hash.ts",
  `export const ROOT_STATE_SCHEMA = "${schemaHash}";`,
  (err) => {
    if (err) throw err;
  }
);

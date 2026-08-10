// Checks that every message ID in the UI translation catalogs follows the
// project's explicit-ID convention.
//
// We use Lingui's explicit IDs rather than generated ones (see
// docs/ui-localization.md). This checks that the IDs follow the dot-separated
// pattern.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const localesDir = join(root, "src/locales");

// Dot-separated lowerCamelCase segments, at least two of them.
const ID_PATTERN = /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)+$/;

const catalogs = readdirSync(localesDir)
  .filter((name) => name.endsWith(".json"))
  .sort();

if (catalogs.length === 0) {
  throw new Error(
    `No catalogs found in ${localesDir}. Has \`npm run i18n:extract\` been run?`,
  );
}

let totalChecked = 0;
let totalBad = 0;

for (const catalog of catalogs) {
  const path = join(localesDir, catalog);
  const messages: Record<string, unknown> = JSON.parse(
    readFileSync(path, "utf8"),
  );
  const ids = Object.keys(messages);
  totalChecked += ids.length;

  const bad = ids.filter((id) => !ID_PATTERN.test(id));
  if (bad.length === 0) continue;

  totalBad += bad.length;
  console.error(`\n${join("src/locales", catalog)}: ${bad.length} bad ID(s)`);
  for (const id of bad) {
    console.error(`  ${JSON.stringify(id)}`);
  }
}

if (totalBad > 0) {
  console.error(
    `\nEvery message needs an explicit ID in dot-separated lowerCamelCase, ` +
      `such as "deviceClassEditor.parametersEditor.newParam".\n` +
      `See docs/ui-localization.md.`,
  );
  process.exit(1);
}

console.log(
  `Checked ${totalChecked} message ID(s) across ${catalogs.length} catalog(s).`,
);

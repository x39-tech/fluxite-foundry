// Builds the `latest.json` that the Tauri updater plugin reads from the updates
// endpoint.
//
// `createUpdaterArtifacts` in the Tauri config leaves a detached minisign
// signature next to every update artifact it produces, so this script takes
// the `.sig` files as its input: each one names an artifact (its own path
// minus the suffix), and the artifact's path says which platform it is for.
//
// Usage:
//
//   node scripts/make-update-manifest.mjs \
//     --base-url https://example.com/downloads \
//     [--version 0.1.1] [--notes "..."] [--pub-date <RFC 3339>] \
//     [--out latest.json] \
//     <sig file or directory to search>...
//
// The version defaults to the one in package.json, which is the same source the
// bundle takes it from, so the manifest and the artifacts cannot disagree.

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { arch, argv, stdout } from "node:process";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

const NODE_ARCH_TO_RUST = { arm64: "aarch64", x64: "x86_64" };
const NSIS_ARCH_TO_RUST = { x64: "x86_64", arm64: "aarch64", x86: "i686" };
const DARWIN_TARGET_DIRS = {
  "universal-apple-darwin": ["darwin-aarch64", "darwin-x86_64"],
  "aarch64-apple-darwin": ["darwin-aarch64"],
  "x86_64-apple-darwin": ["darwin-x86_64"],
};

const parseArgs = (argv) => {
  const options = {};
  const inputs = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const value = argv[++i];
      if (value === undefined) {
        throw new Error(`Missing a value for ${arg}.`);
      }
      options[arg.slice(2)] = value;
    } else {
      inputs.push(arg);
    }
  }

  return { options, inputs };
};

/** Every `.sig` at or below `path` */
const findSignatures = (path) => {
  if (!statSync(path).isDirectory()) {
    return path.endsWith(".sig") ? [path] : [];
  }

  return readdirSync(path).flatMap((entry) =>
    findSignatures(join(path, entry)),
  );
};

/**
 * Work out which `platforms` keys an artifact should be published under.
 *
 * A cargo build writes to `target/<triple>/release` for a cross build and plain
 * `target/release` for a native one, so on macOS the triple is read from the
 * path and falls back to the CPU actually running this script. Windows bundles
 * carry their architecture in the installer filename instead.
 *
 * @returns one key, or both macOS keys for a universal artifact.
 */
const platformKeys = (artifact) => {
  if (artifact.endsWith(".app.tar.gz")) {
    for (const [dir, keys] of Object.entries(DARWIN_TARGET_DIRS)) {
      if (artifact.includes(`/${dir}/`)) {
        return keys;
      }
    }

    const hostArch = NODE_ARCH_TO_RUST[arch];
    if (!hostArch) {
      throw new Error(
        `${artifact} looks like a native macOS build, but this machine's ` +
          `architecture (${arch}) has no Rust target name here.`,
      );
    }
    return [`darwin-${hostArch}`];
  }

  // e.g. `Fluxite Foundry_0.1.1_x64-setup.exe`
  const nsis = /_([^_]+)-setup\.exe$/.exec(basename(artifact));
  if (nsis) {
    const nsisArch = NSIS_ARCH_TO_RUST[nsis[1]];
    if (!nsisArch) {
      throw new Error(
        `${artifact} names an architecture (${nsis[1]}) that has no Rust ` +
          `target name here.`,
      );
    }
    return [`windows-${nsisArch}`];
  }

  throw new Error(
    `Cannot tell which platform ${artifact} is for. Update the rules in ` +
      `scripts/make-update-manifest.mjs if a new bundle target was added.`,
  );
};

const { options, inputs } = parseArgs(argv.slice(2));

if (!options["base-url"]) {
  throw new Error(
    "--base-url is required: it is where the artifacts are served from.",
  );
}

if (inputs.length === 0) {
  throw new Error(
    "Pass at least one `.sig` file, or a directory to search for them.",
  );
}

const version =
  options.version ??
  JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;

const baseUrl = options["base-url"].replace(/\/$/, "");
const signatures = inputs.flatMap(findSignatures);

if (signatures.length === 0) {
  throw new Error(`Found no .sig files under: ${inputs.join(", ")}`);
}

const platforms = {};
const claimedUrls = new Map();

for (const signature of signatures) {
  const artifact = signature.slice(0, -".sig".length);
  const entry = {
    signature: readFileSync(signature, "utf8").trim(),
    // The filename is the only part that varies, and it has spaces in it.
    url: `${baseUrl}/${encodeURIComponent(basename(artifact))}`,
  };

  const claimant = claimedUrls.get(entry.url);
  if (claimant && claimant !== artifact) {
    throw new Error(
      `${artifact} and ${claimant} are different files that would both be ` +
        `published at ${entry.url}. Rename one before uploading, and pass the ` +
        `renamed path here.`,
    );
  }
  claimedUrls.set(entry.url, artifact);

  for (const key of platformKeys(artifact)) {
    if (platforms[key]) {
      throw new Error(
        `Two artifacts both claim to be ${key}. The inputs probably include ` +
          `more than one build of the same platform, such as a universal macOS ` +
          `build alongside a single-architecture one.`,
      );
    }

    platforms[key] = entry;
  }
}

const manifest = {
  version,
  pub_date: options["pub-date"] ?? new Date().toISOString(),
  platforms,
};

if (options.notes) {
  manifest.notes = options.notes;
}

const json = `${JSON.stringify(manifest, null, 2)}\n`;

if (options.out) {
  writeFileSync(options.out, json);
  console.log(
    `Wrote ${options.out} for ${version}: ${Object.keys(platforms).join(", ")}`,
  );
} else {
  stdout.write(json);
}

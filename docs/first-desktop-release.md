# Shipping the First Desktop Release

This document lists what remains before Fluxite Foundry can be handed to desktop users for the first time.

See [Multi-Platform Deployment](architecture.md#multi-platform-deployment) for how the desktop and web builds relate.

## Current status

The application side is essentially done. The desktop app builds, saves files through native dialogs, carries a real Content Security Policy, single-sources its version from `package.json`, and contains a working updater with a signing key generated. The rest of the work is enabling distribution.

The three unfinished areas are: proving the update flow actually works, deciding where releases get built, and everything that decision unblocks.

## 1. Prove the update flow on macOS and Windows

The updater is wired up but has never run for real. This is the only item that is blocked on nothing and can be done today.

### Why the happy path proves nothing

The signature is checked over the downloaded artifact, in `download()`, not in `check()`. Reaching an update prompt therefore proves the endpoint, manifest and version comparison work, and proves nothing whatsoever about signing. A build that never verifies signatures would look identical.

The test that matters is the negative one. After a successful update, tamper with the artifact (flip a byte, or sign it with a different key) and confirm the update is _rejected_.

### Step 1: test the 'check for updates' path

```
npm run tauri:dev:updater
```

Serve a `latest.json` on `localhost:8000` advertising a higher version, then use _Check for Updates_ in the app menu. This exercises the endpoint, the manifest parse, the version comparison, and the prompt UX in about a minute.

The dev config exists because the updater refuses plain HTTP by default (`InsecureTransportProtocol`). `tauri.updater-dev.conf.json` sets `dangerousInsecureTransportProtocol` for localhost only, and is never part of a shipped build.

This file and script should probably be removed after initial testing.

### Step 2: test end-to-end update on both platforms

1. Build at the current version and install the result.
2. Bump `package.json`, build again. `createUpdaterArtifacts` produces the update artifact and a `.sig` alongside the installer.
3. Write a `latest.json` containing the `.sig` contents and a localhost URL for the artifact.
4. Run the installed older version and take the update.
5. Break the signature and confirm the update is refused.

This should be tested both on macOS and Windows.

Endpoints support `{{target}}`, `{{arch}}`, `{{current_version}}` and `{{bundle_type}}` templating, which the real manifest may want.

`scripts/make-update-manifest.mjs` builds the manifest from the `.sig` files the bundler leaves next to each artifact, inferring the platform keys (`darwin-aarch64` vs `windows-x86_64`) from the artifact paths. CI will need it to build the real manifest.

## 2. Choose a build host (particularly for macOS)

**This blocks everything below it.** GitLab's free tier has no macOS runners, and macOS hardware is unavoidable: the Xcode toolchain and `notarytool` only run there. Need to find a macOS solution, either migration/mirror to GitHub or a self-hosted macOS runner.

Note that NSIS can be cross-compiled from macOS or Linux, which could improve flexibility here.

## 3. Code signing

### macOS

Work out developer credentials, procure a developer ID application certificate, hardened runtime, sign, notarize via `notarytool`, then staple the ticket. **Verify offline installation** with no phoning home.

**Test the downloaded artifact, not the built one.** The quarantine flag is attached by the browser at download time, so a locally built DMG will not exercise Gatekeeper at all. The only meaningful test is downloading the release like a user would, on a machine that has never seen the app.

### Windows

Unsigned means a SmartScreen "Windows protected your PC" prompt that users can click past. Annoying, not blocking. Research Windows signing solutions.

## 4. What the release pipeline has to do

Triggered by a tag, not by `main`.

**Build matrix**

- macOS: `npm run tauri:build:macos` (universal binary; needs both `aarch64-apple-darwin` and `x86_64-apple-darwin` Rust targets installed).
- Windows: `npm run tauri:build:windows` and `npm run tauri:build:windows:offline`.

**Secrets**

| Variable                                                                    | Purpose                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------------------- |
| `TAURI_SIGNING_PRIVATE_KEY`                                                 | Signs update artifacts                                   |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`                                        | Currently empty; add a password before the first release |
| `APPLE_CERTIFICATE`, `APPLE_CERTIFICATE_PASSWORD`, `APPLE_SIGNING_IDENTITY` | Signing                                                  |
| `APPLE_API_KEY`, `APPLE_API_ISSUER`, `APPLE_API_KEY_PATH`                   | Notarization                                             |

Make sure to protect and mask as appropriate for the CI platform being used.

Note the two Windows builds emit the same NSIS filename, so the pipeline must rename or move the first artifact before producing the second, and the download page must label them clearly.

## 5. Publish the update manifest

The updater endpoint is `https://foundry.fluxite.dev/updates/latest.json`. Need to ensure that this can be published independently of the app code or in the same pages job.

Options here:

- Have the Pages job generate `latest.json` at deploy time from the latest release (via the API of whichever host holds the binaries).
- Commit `latest.json` to the repository as part of cutting a release, so the Pages job publishes it like any other file.
- Host the manifest somewhere other than Pages, accepting a second piece of infrastructure.

The binaries themselves can live wherever the build-host decision lands: GitLab Releases, GitHub Releases, or object storage. Only the manifest URL is load-bearing.

## 6. Decisions that cannot be undone after v0.1.0

Everything here is free to change now and expensive or impossible to change later.

- **The signing key.** The tauri updater is a little inflexible - only one public key is supported. An installed client trusts exactly one key forever. There is no revocation and no way to trust two keys during a transition. If the key is compromised, the only path is to ship an update signed with the old key that embeds a new public key. If the key is lost, all users will need to hand-install new updates.
- **The updater endpoint URL** is baked into every build. Moving off `foundry.fluxite.dev` later means old clients keep asking the old address.
- **The bundle identifier** `dev.fluxite.foundry` becomes the app's identity on disk, and its cache and data directories hang off it.

## 7. Also outstanding

- **The "Get the desktop app" button.** The web app needs a way to point users at the desktop build. It should link to a page on `foundry.fluxite.dev` that we control rather than to a release URL directly, be hidden when already running under Tauri, and offer the right binary per platform. Blocked only on the download page existing.
- **Verify the CSP in a real build.** The CSP is only applied to assets served through the Tauri asset protocol, and `tauri dev` loads the front end from the Vite dev server instead, so **the CSP is not active in dev and cannot be tested there**. The 3D viewport (WebGL) and delver (WASM, needing `'wasm-unsafe-eval'`) are the parts most likely to break under it, and they will only break in a build.
- **Save file forward compatibility.** Desktop introduces version skew for the first time. A file written by a newer version must fail cleanly in an older one rather than half-migrate.
- **Release notes.** Desktop users see a version number and want to know what changed; the updater manifest can carry notes, and the prompt already displays them.
- **A privacy line.** The updater contacts our server on every launch, which discloses an IP address and a version. Harmless, but worth stating explicitly.

## 8. Deliberately deferred

- **Linux.** Introduces some complexity involving WebKitGTK fragmentation across the 4.0/4.1 split, distro-pinned engine versions we cannot control, and a glibc floor, for limited benefit.
- **MSI.** NSIS installs per-user without admin rights, which provides more flexibility. MSI can be added later, at the cost of requiring a Windows builder.

# Testing the Desktop Updater

This set of steps enables you to locally test the Tauri plugin that auto-updates the desktop version of this app, including testing negative paths like failed signature verification. It is written for macOS primarily, with Windows differences at the end.

## Setup

```
export TAURI_SIGNING_PRIVATE_KEY="/path/to/fluxite-foundry.key"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="<password>"
mkdir -p ~/fluxite-updates
```

Builds must pass `--config src-tauri/tauri.updater-dev.conf.json`, which points the updater at `http://localhost:8000` and allows plain HTTP. It relaxes only the transport check, not signature verification.

## Step 1: Working update

Build 0.1.0 and install it:

```
npx tauri build --target universal-apple-darwin --bundles app \
  --config src-tauri/tauri.updater-dev.conf.json

BUNDLE="src-tauri/target/universal-apple-darwin/release/bundle/macos"
cp -R "$BUNDLE/Fluxite Foundry.app" /Applications/
cp -R "$BUNDLE/Fluxite Foundry.app" ~/fluxite-updates/0.1.0-pristine.app
```

Run the `/Applications` copy, never the one under `target/`: the next build overwrites it, and the updater replaces the bundle in place. The pristine copy is how you get back to 0.1.0 in step 3 without rebuilding.

Build 0.1.1 and publish it:

```
npm version 0.1.1 --no-git-tag-version
npx tauri build --target universal-apple-darwin --bundles app \
  --config src-tauri/tauri.updater-dev.conf.json

cp "$BUNDLE/Fluxite Foundry.app.tar.gz" ~/fluxite-updates/
node scripts/make-update-manifest.mjs \
  --base-url http://localhost:8000 \
  --notes "End-to-end update test." \
  --out ~/fluxite-updates/latest.json \
  "$BUNDLE"
```

The script should report both `darwin-aarch64` and `darwin-x86_64`. If it reports no `.sig` files, the build did not pick up the signing key.

Launch `/Applications/Fluxite Foundry.app` and use _Check for Updates..._.

**Passing:** the prompt offers 0.1.1; the app downloads, relaunches, and shows 0.1.1 in _About Fluxite Foundry_.

## Step 2: Fail signature verification

Reset to 0.1.0:

```
rm -rf "/Applications/Fluxite Foundry.app"
cp -R ~/fluxite-updates/0.1.0-pristine.app "/Applications/Fluxite Foundry.app"
```

Tamper with the artifact:

```
printf '\x00' | dd of=~/fluxite-updates/"Fluxite Foundry.app.tar.gz" \
  bs=1 seek=1000 count=1 conv=notrunc
```

**Passing:** the update is refused and the app stays on 0.1.0, with a toast reading `Could not install version 0.1.1: ...`.

Make sure to read the error message. A signature error is a pass. A connection error means nothing was proven. Confirm in the `http.server` log that the `.app.tar.gz` was actually fetched.

## Cleanup

```
git checkout package.json
rm -rf "/Applications/Fluxite Foundry.app" ~/fluxite-updates
unset TAURI_SIGNING_PRIVATE_KEY TAURI_SIGNING_PRIVATE_KEY_PASSWORD
```

## Notes

### Two GETs in the HTTP server log

`main.tsx` wraps the app in `React.StrictMode`, which double-invokes effects in dev, so the startup check in `App.tsx` runs twice and `http.server` logs two requests for `/latest.json`. Only one toast appears, because an offer is keyed by version. Production builds check once.

### Windows

- The artifact is the NSIS installer plus its `.sig`; the key is `windows-x86_64`.
- Build with `npx tauri build --config src-tauri/tauri.updater-dev.conf.json`.
- NSIS installs per-user, so there is no `/Applications` equivalent. Keep the pristine copy anyway.
- Unsigned builds raise a SmartScreen prompt. Separate item; does not block this.

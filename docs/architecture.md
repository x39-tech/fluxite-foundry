# Fluxite Foundry Architecture

This document provides an overview of the software architecture of Fluxite Foundry.

## Overview

Fluxite Foundry is a React and TypeScript application. I don't like TypeScript very much, but I like untyped JavaScript even less, so we make heavy use of the type system and adhere to TypeScript best practices, e.g. avoiding 'any'. The tech stack is chosen due to the intended use; the goals are the following:

- Fluxite Foundry should provide a user-friendly, modern UI for working with the Fluxite Codex data format.
- Fluxite Foundry should be usable both from a browser and as a desktop application. Both are built from this repository; see [Multi-Platform Deployment](#multi-platform-deployment).
- Following from the above, Fluxite Foundry **should not require any server-side infrastructure besides serving the web app.**
- Following from the above, Fluxite Foundry **must implement all state and application logic in client code**. It also supports saving and loading its state in save files, like most desktop applications.

## Technology Stack

| Category         | Technology                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Framework        | [React](https://react.dev/)                                                                                            |
| Build Tool       | [Vite](https://vite.dev/)                                                                                              |
| Desktop Shell    | [Tauri](https://v2.tauri.app/)                                                                                         |
| Language         | TypeScript                                                                                                             |
| State Management | [Zustand](https://zustand.docs.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) + [Zod](https://zod.dev/)         |
| UI Components    | [Shadcn UI](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)                                         |
| Asset Storage    | [Dexie](https://dexie.org/) (IndexedDB)                                                                                |
| Testing          | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) |

## Multi-Platform Deployment

We deploy as a web app continuously to GitLab Pages, and as a desktop app for Windows and macOS wrapped with [Tauri](https://v2.tauri.app/). Tauri loads the same built front end into the operating system's own webview and wraps it in a small Rust process.

All functionality should stay in the frontend unless it is something that can only be done on a native app, such as sending live sACN from the test DMX controller. There are also a few places where the multi-platform support requires forked logic for the same functionality, like exporting files.

### Single Build

Everything under `/src` runs on both targets. Platform differences are resolved at runtime, never with build-time flags. Code needing a native capability branches on `isTauri()` from `@tauri-apps/api/core` and keeps a browser fallback.

Tauri plugins are imported lazily inside the desktop branch, so the web bundle never pulls them in.

### Versioning

`package.json` holds the version and is the single source of truth. `tauri.conf.json` reads it via `"version": "../package.json"`, and Vite injects the same value as `__APP_VERSION__` so it's readable from the app. `src-tauri/Cargo.toml` deliberately carries no version field and doesn't need one.

The web app deploys from every commit to `main` and is identified by `__BUILD_STRING__` (timestamp, commit hash, and a random word). Desktop releases are cut deliberately from a tag and assigned a version number. Shipping desktop also breaks the invariant that every user runs the same version, so save files must degrade gracefully when opened by an older build than the one that wrote them.

### Distribution and Updates

Desktop builds bundle to `nsis` on Windows and a universal `dmg` plus `app` on macOS, configured per platform in `tauri.windows.conf.json` and `tauri.macos.conf.json`. Linux is not supported.

The app updates itself through `tauri-plugin-updater`, which reads a static JSON manifest and verifies a signature over each downloaded artifact.

## Project Structure

```
/src/
├── app/                     # Core app state and initialization
│   ├── store.ts             # Zustand stores
│   ├── persistentState/     # Versioned state schemas
│   └── assetStorage.ts      # Dexie-based asset storage
├── features/                # Feature modules (see Feature Organization below)
├── codex/                   # E173 standard integration
├── components/              # Reusable UI components
│   └── scn-ui/              # Components copied from shadcn/ui
├── e173/                    # Git submodule - E173 spec
├── hooks/                   # Custom React hooks
├── utils/                   # Utility functions
└── test/                    # Test utilities
```

The desktop shell lives in `/src-tauri/`:

```
/src-tauri/
├── src/                            # Desktop-specific backend logic
├── capabilities/                   # What the webview may ask the shell to do
├── tauri.conf.json                 # Base desktop config, shared by all platforms
├── tauri.macos.conf.json           # macOS bundle targets
├── tauri.windows.conf.json         # Windows bundle targets, WebView2 install mode
├── tauri.windows-offline.conf.json # Build flavor: WebView2 embedded for offline install
├── tauri.updater-dev.conf.json     # Build flavor: point updates at localhost for testing
└── icons/                          # Generated by `npm run icons`
```

Platform-specific config files are discovered and merged by Tauri automatically. The flavor files are opted into with `tauri build --config <file>`, and have npm scripts wrapping them.

### Feature Organization

Features are self-contained modules in `/src/features/`. Each feature typically contains:

```
features/someFeature/
├── state.ts              # Feature-specific state and hooks
├── SomeFeature.tsx       # Main component
├── SomeFeature.test.tsx  # Tests
└── subFeature/           # Nested sub-features follow the same pattern
```

This structure keeps related code together and reduces coupling between features.

Features might also be made up of multiple components.

## State Management

See [State Management](state-management.md) for detailed documentation on:

- Persistent and runtime stores
- Access and update patterns
- State versioning and migrations
- Adding new state versions

## UI Components

### Component Library

UI components follow the [shadcn/ui](https://ui.shadcn.com/) pattern: Radix UI provides unstyled, accessible headless components, which are wrapped with Tailwind styling in `/src/components/scn-ui/`.

For components in that directory, we copy them directly from the shadcn-ui website (select "Manual", not "CLI". We don't use the CLI.) Changes should be made to these components rarely. If making a change to this component from the copied code, add a comment explaining the change that was made and why.

We also have some of our own reusable UI components that wrap the Shadcn ones. Those are in `/src/components/`.

### Layout System

The application uses [FlexLayout React](https://github.com/nicerobot/FlexLayout) for a docking/tabbed interface. Layout state is saved per editor as JSON in the persistent state.

### Icons

We use a simple hexagon icon to represent the app, defined in `src/components/icons/AppLogoMark.svg`.

`scripts/generate-icons.mjs` (invoked from `npm run icons`) convert this to various static forms that are needed in places like the browser favicon and desktop app icons.

## Testing

### Setup

- **Vitest** as the test runner with happy-dom
- **React Testing Library** for component testing
- **fake-indexeddb** for Dexie tests

### Organization

Tests are co-located with source files using `*.test.ts` / `*.test.tsx` naming.

### Test Utilities

`/src/test/utils.ts` provides helpers for resetting stores and creating test fixtures.

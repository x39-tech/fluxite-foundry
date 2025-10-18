# Fluxite Foundry Architecture

This document provides an overview of the software architecture of Fluxite Foundry.

## Overview

Fluxite Foundry is a React and TypeScript application. I don't like TypeScript very much, but I like untyped JavaScript even less, so we make heavy use of the type system and adhere to TypeScript best practices, e.g. avoiding 'any'. The tech stack is chosen due to the intended use; the goals are the following:

- Fluxite Foundry should provide a user-friendly, modern UI for working with the Fluxite Codex data format.
- Fluxite Foundry should be usable both from a browser and as a desktop application (currently, only the browser version is implemented).
- Following from the above, Fluxite Foundry **should not require any server-side infrastructure besides serving the web app.**
- Following from the above, Fluxite Foundry **must implement all state and application logic in client code**. It also supports saving and loading its state in save files, like most desktop applications.

## Technology Stack

| Category         | Technology                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Framework        | [React](https://react.dev/)                                                                                            |
| Build Tool       | [Vite](https://vite.dev/)                                                                                              |
| Language         | TypeScript                                                                                                             |
| State Management | [Zustand](https://zustand.docs.pmnd.rs/) + [Immer](https://immerjs.github.io/immer/) + [Zod](https://zod.dev/)         |
| UI Components    | [Shadcn UI](https://ui.shadcn.com/) + [Tailwind CSS](https://tailwindcss.com/)                                         |
| Asset Storage    | [Dexie](https://dexie.org/) (IndexedDB)                                                                                |
| Testing          | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) |

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

## Testing

### Setup

- **Vitest** as the test runner with happy-dom
- **React Testing Library** for component testing
- **fake-indexeddb** for Dexie tests

### Organization

Tests are co-located with source files using `*.test.ts` / `*.test.tsx` naming.

### Test Utilities

`/src/test/utils.ts` provides helpers for resetting stores and creating test fixtures.

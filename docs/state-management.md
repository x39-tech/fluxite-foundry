# State Management

This document describes how application state is managed in Fluxite Foundry.

## Overview

State is managed using Zustand with Immer for immutable updates. The application maintains two separate stores:

1. **`useAppPersistentStore`** - Persisted to localStorage, survives page reloads. Also can be saved and loaded as a save file.
2. **`useAppRuntimeStore`** - Runtime-only state (e.g., DMX controller, loaded libraries, system preferences)

We maintain and migrate the persistent state like a primitive database. The format of entities defined by Fluxite Codex is converted to a native form for this application which is validated by [Zod](https://zod.dev). We try to keep state in a somewhat normalized form and not to nest entities too deeply, to help with migration and transformation. Generally, an entity defined by a user of this app, such as a parameter, command, command argument, enum choice, etc., is stored in a top-level map with a primary [nanoid](https://github.com/ai/nanoid) key, similar to a relational database table. Keys are stored using the branded type `EntityId`. This causes some structures to differ from how they are represented in Fluxite Codex.

Additionally, we do not reference types defined in external libraries or schemas in the persistent state, since that would create problems with maintaining versions of the state over time as they get out of sync with the types defined by the external dependencies. The goal is to support migrations from arbitrarily old saved states to newer ones.

This is why you might see duplication between the definitions in the persistent state and those in the external `delver` library, for example. This is intentional and worth the tradeoff.

The runtime state is more loosely defined, since it doesn't need to be migrated over time. It can use any types as necessary in whatever structure is most convenient.

## Access Pattern

Generally, hooks that access state are created in the `state.ts` file for a given feature. Hooks are composed based on `useAppPersistentStore()` and `useAppRuntimeStore()`, sometimes with multiple levels, for example:

```
useLocalizations -> useCurrentEditorPart -> useAppPersistentStore
```

There are some functions in `app/stateUtils.ts` to help with common state selection patterns, e.g. selecting entities based on a filter.

`useAppPersistentStore`/`useAppRuntimeStore` and derivative hooks use a selector pattern which will be familiar to anyone who has used Redux or a derived framework. **Be careful not to return newly-created objects or arrays in selectors, as this will cause unnecessary re-renders and could cause an infinite loop.**

If you want to write an access hook that returns a transformed form of state data, there are generally two options. If the transformed data is an array or object that does not have deep nesting, you can use the [useShallow](https://zustand.docs.pmnd.rs/hooks/use-shallow) pattern from Zustand. Or, you can return unmodified state in your selector function and then transform it outside the selector function.

### Don't

```typescript
function useEditorNames(): string[] {
  return useAppPersistentStore((state) => {
    return Object.values(state.editors).map((editor) => editor.name); // New array each time - causes re-renders
  });
}
```

### Do

Either use `useShallow`:

```typescript
import { useShallow } from "zustand/react/shallow";

function useEditorNames(): string[] {
  return useAppPersistentStore(
    useShallow((state) =>
      Object.values(state.editors).map((editor) => editor.name),
    ),
  );
}
```

Or do transformation after selecting from the state:

```typescript
function useEditorNames(): string[] {
  const editors = useAppPersistentStore((state) => state.editors);
  return useMemo(
    () => Object.values(editors).map((editor) => editor.name),
    [editors],
  );
}
```

Note: we have some shortcuts for the `useShallow` pattern at various parts of the app, like `useCurrentEditorPartShallow()`.

## Update Pattern

State updates use Immer's `produce()` pattern; calls to update the state provide a 'recipe' function, inside which state can be modified at arbitrary levels of nesting. Immer handles producing a new immutable state such that the reactive nature of Zustand works correctly.

```typescript
updateAppPersistentState((state) => {
  state.appSettings.theme = "dark"; // Direct mutation - Immer handles immutability
});
```

## Asset Storage (IndexedDB)

Binary assets (images, media) are stored in IndexedDB via Dexie with deduplication by SHA-256 hash.

## State Versioning and Migrations

The persistent state schema is versioned and immutable once committed. This allows the app to load state saved by any previous version and migrate it to the current schema.

### Directory Structure

```
src/app/persistentState/
├── v1/
│   ├── state.ts        # V1 schema (immutable)
│   └── state.test.ts
├── v2/
│   ├── state.ts        # V2 schema (immutable)
│   ├── migrate.ts      # Migration V1 → V2 (mutable)
│   └── migrate.test.ts
└── ...
```

Each version directory contains:

- `state.ts` - The Zod schema for that version. Once committed, this file is **immutable** and protected by CI.
- `migrate.ts` - The migration function from the previous version. This file remains **mutable** so bugs can be fixed.
- Test files for both schema and migration.

### How Migrations Work

Migrations are **sequential**: to migrate from V1 to V3, the system runs V1→V2, then V2→V3. This approach:

- Keeps each migration simple and focused
- Avoids a combinatorial explosion of migration paths
- Makes testing straightforward

The migration runner in `persistentState.ts`:

1. Starts with the persisted state and its version number
2. Finds the migration for the current version and applies it
3. Repeats until reaching the current version
4. Validates the result against the current Zod schema
5. Falls back to default state if migration fails

### Adding a New State Version

When you need to change the persistent state schema:

1. **Create the new version directory:**

   ```
   src/app/persistentState/vN/
   ```

2. **Create `state.ts`** with the new schema:
   - Copy the previous version's `state.ts` as a starting point
   - Update `VERSION` to the new number
   - Make your schema changes
   - Export the schema and types as before

3. **Create `migrate.ts`** with the migration function:

   ```typescript
   import { AppPersistentState as PrevState } from "../v(N-1)/state";
   import { AppPersistentState as NextState } from "./state";

   export function migrateV(N-1)toVN(state: PrevState): NextState {
     return {
       ...state,
       // Transform changed fields here
     };
   }
   ```

4. **Create `migrate.test.ts`** with migration tests:
   - Test that each changed field migrates correctly
   - Test that unchanged fields are preserved
   - Test that the result validates against the new schema

5. **Update `persistentStateMigrations.ts`:**
   - Import the new migration function
   - Add the migration to the `MIGRATIONS` array

6. **Update `persistentState.ts`:**
   - Import the new state module
   - Update the re-export to point to the new version
   - Update `VERSION` to the new number

7. **Update code that uses changed fields** throughout the codebase.

8. **Run tests** to verify everything works: `npm run test`

### State Snapshots

The **Debug** menu has **Export State...** and **Import State...**, which write and read a _state snapshot_: a JSON file containing the whole persistent state, the state version it was written at, and (optionally) the entire contents of the IndexedDB asset database with the asset bytes base64-encoded.

This exists mainly to test migrations. Export a snapshot from a build, add a new state version, then import the snapshot and check the migration report.

Import writes the snapshot's state to localStorage in the shape the Zustand persist middleware expects, tagged with the snapshot's own version, and then reloads the app. Migration then runs on the normal load path.

Snapshots keep the state version and the snapshot file format version separate. `SNAPSHOT_FORMAT_VERSION` only needs to change if the outer object around the state changes. Only `formatVersion`, `stateVersion` and `state` are required, so a snapshot can be trimmed down or hand-written when constructing a migration test case.

If a snapshot includes assets, importing it replaces the asset database wholesale. If it does not, the stored assets are left alone.

### CI Protection

The `check_state_immutability` CI job prevents modifications to existing `state.ts` files. If you need to change a committed schema, you must create a new version instead. Migration files (`migrate.ts`) remain editable so bugs in prior migrations can be fixed if necessary.

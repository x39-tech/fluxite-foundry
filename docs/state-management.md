# State Management

This document describes how application state is managed in Fluxite Foundry.

## Overview

State is managed using Zustand with Immer for immutable updates. The application maintains two separate stores:

1. **`useAppPersistentStore`** - Persisted to localStorage, survives page reloads. Also can be saved and loaded as a save file.
2. **`useAppRuntimeStore`** - Runtime-only state (e.g., DMX controller, loaded libraries, system preferences)

We maintain and migrate the persistent state like a primitive database. The format of entities defined by Fluxite Codex is converted to a native form for this application which is validated by [Zod](https://zod.dev). We try to keep state in a somewhat normalized form and not to nest entities too deeply, to help with migration and transformation. Generally, an entity defined by a user of this app, such as a parameter, command, command argument, enum choice, etc., is stored in a top-level map with a primary [nanoid](https://github.com/ai/nanoid) key, similar to a relational database table. Keys are stored using the branded type `EntityId`. This causes some structures to differ from how they are represented in Fluxite Codex.

See "Documents and Entities" below for more details about the heuristics we use to shape the state.

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

Every change must go through `updateAppPersistentState`, because side-effect listeners such as `subscribeToStatePatches` are wired in through that update path. Any function that the app logic uses to update the persistent state must be a wrapper around this function.

## Side Effects

If a state change needs to result in a side-effect that is not expressible via React plumbing such as `useEffect`, the side-effect should be registered on the store using `useAppPersistentStore.subscribe`. Do not simply fire these side-effects from the same place that the state is updated, because then they will not be replayed properly on undo and redo.

See `features/deviceClassEditor/effects.ts` and its behavior around DMX drivers as an example of this type of side-effect subscription.

Because state changes are done using Immer, side-effect subscribers can compare old and new state by a simple referential comparison of top-level fields.

## Documents and Entities

As mentioned above, we try to keep our state in a somewhat normalized form. This applies particularly to _documents_, which is our name for a piece of state that can be saved and loaded separately from others, and presents as a single "editor" in the app.

### The Shape of the Root

The persistent state has three parts:

```typescript
interface AppPersistentState {
  appSettings; // theme, orgId, locale
  session; // open document ids, selection, per-document window layouts
  documents: Record<EntityId, Document>;
}
```

`Document` is a union discriminated on `type`, with one arm per kind of document (a device class, and in future a library or a system).

`session` contains state specific to _open_ documents which are currently being edited, but which should not travel with those documents when they are saved.

### Entities

Within a document we generally find tables of entities. For example, a simplified form of a `DeviceClassDocument`:

```typescript
export interface DeviceClassDocument {
  type: "deviceClass";

  deviceClassId: string;
  deviceClassVersion: string;

  parameters: Record<EntityId, Parameter>;
  commands: Record<EntityId, Command>;

  enumChoices: Record<EntityId, EnumChoice>;
}
```

Note the consequences of normalization here: an `EnumChoice` is a child of a `Parameter` (and other entities as well, but we are simplifying here), but is stored in a separate table with a `parent` field pointing back at the respective `Parameter` by its `EntityId`.

We refer to types that live in these top-level tables of a document as _entities_. But note that some members of a document are _not_ entities (in this example, `deviceClassId` and `deviceClassVersion` are simple string values). Also, some entities might have nested data inside them. We follow a set of heuristics to determine whether a piece of a document's data should be an entity:

1. It has a unique identity.
2. Something needs to remember or reference its identity across time.
3. It can be created or deleted independently of its parent.
4. Something needs to list all of them at once.
5. It has localized fields (see "Localizations" below).
6. It is not derivable from other state data.

These are not hard-and-fast rules, but the more "yes" answers you have to these criteria, the more likely it is that the thing you are trying to define should be an entity. There are exceptions; for example, `DeviceClassBasicData` has `compatibleFirmwareVersions`, which is an array of strings, each of which can be created and deleted independently in the app's UI. Even though this satisfies 2 above, we don't make these entities because they are simple string values and don't satisfy the other heuristics.

We also follow some structural rules when it comes to entities:

1. Entity tables live at the top level of a document and are not nested.
2. Entity tables should not be optional. `{}` is sufficient to represent an empty table.
3. Within a document, entities should not be defined inside a discriminated union arm. The document union itself is the exception, and the reason for the qualifier: a document type is an arm of `Document` and holds its own entity tables at its top level. The rule is about unions _inside_ a document, where an entity's table would come and go with the arm.
4. If entities need to be ordered, prefer to store an ordered list of IDs alongside the entity table.

Note that we have some existing violations of these rules in the app, due to history. This is a state we are working toward, not one we have completely achieved yet.

## Localizations

Each document owns its localized strings, in a `localizations` table keyed by a branded `LocalizationKey`. Every localized field of an entity lives under `localized`, by convention:

```typescript
const parameter = {
  codexId: "intensity",
  localized: {
    friendlyName: someLocalizationKey,
  },
};
```

That convention allows us to build powerful tools for managing localized data and deriving back-references from localization strings to the entities that reference them; this code lives in `features/localizations/`.

Each document containing _localizable_ entities (entities containing at least one localizable field) must also define a `LocalizationRegistry` which contains the set of metadata for each localizable field on each entity within the document.

A document also records the `sourceLocale` it was authored in, which says which strings are authoritative and which are translations of them.

### Localization Keys

We treat localizations as entities, the same as all other entities, and they are thus keyed by opaque `EntityId`s (nanoids). The Fluxite Codex import/export format generally wants more meaningful names for localization keys, and its _overlay localization_ functionality makes the localization keys significant.

Therefore, our localization entities have an `exportKey` which is the key the localization is exported under, when it is set. This is set on import and in the future, a user will be able to edit it. If a localization was created in-app, it has no `exportKey` yet, so export will fall back to a synthesized readable key based on any entities that are referencing the string, e.g. `param_intensity_friendlyName` or similar.

## Asset Storage (IndexedDB)

Binary assets (images, media) are stored in IndexedDB via Dexie with deduplication by SHA-256 hash.

### Asset Lifecycle

An asset belongs to the documents that refer to it. To better support undo and redo functionality, an asset is not deleted when its last referrer is removed. Instead, assets are cleaned up at two different times:

1. When a document is closed, all assets that document referred to which no other document currently refers to are deleted.
2. On app startup, all assets that are not referenced by any document in the rehydrated app persistent state are deleted.

This logic lives in `app/assetLifecycle.ts`.

Each type of document describes where its assets are as a `DocumentAssets` object, so the app core does not need to know what a document looks like.

## State Versioning and Migrations

The persistent state schema is versioned and immutable once committed. This allows the app to load state saved by any previous version and migrate it to the current schema.

### Directory Structure

```
src/app/persistentState/
├── v1/
│   ├── state.ts        # V1 schema (immutable)
├── v2/
│   ├── state.ts        # V2 schema (immutable)
│   ├── migrate.ts      # Migration V1 → V2 (mutable)
│   └── migrate.test.ts
└── ...
```

Each version directory generally contains:

- `state.ts` - The Zod schema for that version. Once committed, this file is **immutable** and protected by CI.
- `migrate.ts` - The migration function from the previous version. This file remains **mutable** so bugs can be fixed.
- A test file for the migration.

### How Migrations Work

Migrations are sequential: to migrate from V1 to V3, the system runs V1→V2, then V2→V3.

The chain lives in `persistentStateMigrations.ts`. Each entry names the two version modules it steps between and the migration function, and nothing else: the version numbers and the schemas are read off the modules, so they cannot disagree with each other. `defineMigration` infers the state types from the migration function's own signature and checks the modules against them, which makes naming the wrong module — or skipping a version — a compile error at that entry. The chain is looked up by version, not by array index, and is checked for contiguity when the module loads. It makes no claim about which version is current: `persistentState.ts` is the only place that says that, and it throws at load if the chain does not reach it.

The migration runner in `persistentState.ts`:

1. Starts with the persisted state and its version number
2. Finds the migration out of the current version and applies it
3. Repeats until reaching the current version
4. Validates the result against the current Zod schema
5. Falls back to default state if migration fails

### Adding a New State Version

When you need to change the persistent state schema:

1. **Write the outgoing version's snapshot,** if it doesn't have one already. Run `npm run state-history:generate` while the current version is still current, and commit the resulting `src/app/persistentState/testdata/vN.json`. See [the snapshot history README](../src/app/persistentState/testdata/README.md).

2. **Create the new version directory:**

   ```
   src/app/persistentState/vN/
   ```

3. **Create `state.ts`** with the new schema:
   - Copy the previous version's `state.ts` as a starting point
   - Update `VERSION` to the new number
   - Make your schema changes
   - Export the schema and types as before

4. **Create `migrate.ts`** with the migration function:

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

5. **Create `migrate.test.ts`** with migration tests:
   - Test that each changed field migrates correctly
   - Test that unchanged fields are preserved
   - Test that the result validates against the new schema

6. **Update `persistentStateMigrations.ts`:**
   - Import the new state module and migration function
   - Add the migration to the `MIGRATIONS` array

7. **Update `persistentState.ts`:**
   - Import the new state module
   - Update the re-export to point to the new version
   - Update `VERSION` to the new number

8. **Update code that uses changed fields** throughout the codebase.

9. **Run tests** to verify everything works: `npm run test`

### State Snapshots

The **Debug** menu has **Export State...** and **Import State...**, which write and read a _state snapshot_: a JSON file containing the whole persistent state, the state version it was written at, and (optionally) the entire contents of the IndexedDB asset database with the asset bytes base64-encoded.

This exists mainly to test migrations. Export a snapshot from a build, add a new state version, then import the snapshot and check the migration report.

Import writes the snapshot's state to localStorage in the shape the Zustand persist middleware expects, tagged with the snapshot's own version, and then reloads the app. Migration then runs on the normal load path.

Snapshots keep the state version and the snapshot file format version separate. `SNAPSHOT_FORMAT_VERSION` only needs to change if the outer object around the state changes. Only `formatVersion`, `stateVersion` and `state` are required, so a snapshot can be trimmed down or hand-written when constructing a migration test case.

If a snapshot includes assets, importing it replaces the asset database wholesale. If it does not, the stored assets are left alone.

### The Snapshot History

`src/app/persistentState/testdata/` holds one snapshot per version the app has ever written state at. `snapshotHistory.test.ts` loads each one, migrates it to the current version, and asserts the result validates, so every migration is exercised against a whole realistic document and not only against the small hand-built states in each version's `migrate.test.ts`. The same test fails if any version below the current one has no snapshot.

See [the snapshot history README](../src/app/persistentState/testdata/README.md) for where the snapshots come from, how to add one, and what they do and do not cover.

### CI Protection

The `check_state_immutability` CI job prevents modifications to existing `state.ts` files. If you need to change a committed schema, you must create a new version instead. Migration files (`migrate.ts`) remain editable so bugs in prior migrations can be fixed if necessary.

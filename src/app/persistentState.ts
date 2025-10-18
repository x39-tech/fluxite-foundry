import * as StateV2 from "./persistentState/v2/state";
import { MIGRATIONS } from "./persistentStateMigrations";

// When creating a new state version:
// 1. Create a new vN/ directory with state.ts and migrate.ts
// 2. Import the new state module and migration function in persistentStateMigrations.ts
// 3. Add the new migration to the MIGRATIONS array in persistentStateMigrations.ts
// 4. Update the re-export and VERSION below to point to the new version

// Re-exports from the current (most recent) state version.
export * from "./persistentState/v2/state";
export const VERSION = StateV2.VERSION;

export type AppPersistentState = StateV2.AppPersistentState;
const AppStateSchema = StateV2.AppStateSchema;

// Migration infrastructure

export function getDefaultState(): AppPersistentState {
  return {
    appSettings: {
      theme: "system",
      orgId: { type: "user", id: crypto.randomUUID() },
      locale: "en-US",
    },
    openEditors: {
      editors: [],
      selectedEditor: -1,
    },
    deviceClassEditors: {},
  };
}

export function migrateState(
  persistedState: unknown,
  fromVersion: number,
): AppPersistentState {
  // Handle edge cases
  if (fromVersion < 1 || fromVersion > VERSION) {
    console.error(
      `Unsupported state version ${fromVersion}. Resetting to default state.`,
    );
    return getDefaultState();
  }

  // Already at current version - just validate
  if (fromVersion === VERSION) {
    const result = AppStateSchema.safeParse(persistedState);
    if (!result.success) {
      console.error(
        "Persisted state invalid. Resetting to default state.",
        result.error,
      );
      return getDefaultState();
    }
    return result.data;
  }

  let state: unknown = persistedState;

  // Run migrations sequentially: v → v+1 → v+2 → ... → VERSION
  for (let v = fromVersion; v < VERSION; v++) {
    const migration = MIGRATIONS[v - 1]; // MIGRATIONS[0] = v1→v2, MIGRATIONS[1] = v2→v3, etc.

    if (!migration) {
      console.error(
        `Missing migration from v${v} to v${v + 1}. Resetting to default state.`,
      );
      return getDefaultState();
    }

    // Validate input state before first migration
    if (v === fromVersion && !migration.fromSchema.safeParse(state).success) {
      console.error(
        `Persisted state doesn't match v${v} schema. Resetting to default state.`,
      );
      return getDefaultState();
    }

    state = migration.migrate(state);
  }

  // Validate final result
  const result = AppStateSchema.safeParse(state);
  if (!result.success) {
    console.error(
      "Migration produced invalid state. Resetting to default state.",
      result.error,
    );
    return getDefaultState();
  }

  return result.data;
}

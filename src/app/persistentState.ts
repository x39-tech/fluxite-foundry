import * as StateV3 from "./persistentState/v3/state";
import { MIGRATIONS } from "./persistentStateMigrations";
import {
  MigrationReport,
  MigrationStep,
  setMigrationReport,
  generateDiff,
} from "./migrationReport";

// When creating a new state version:
// 1. Create a new vN/ directory with state.ts and migrate.ts
// 2. Import the new state module and migration function in persistentStateMigrations.ts
// 3. Add the new migration to the MIGRATIONS array in persistentStateMigrations.ts
// 4. Update the re-export and VERSION below to point to the new version

// Re-exports from the current (most recent) state version.
export * from "./persistentState/v3/state";
export const VERSION = StateV3.VERSION;

export type AppPersistentState = StateV3.AppPersistentState;
const AppStateSchema = StateV3.AppStateSchema;

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
  const steps: MigrationStep[] = [];
  const initialState = structuredClone(persistedState);

  // Helper to create and store a failed report
  const failWithReport = (error: string): AppPersistentState => {
    const report: MigrationReport = {
      startVersion: fromVersion,
      endVersion: VERSION,
      initialState,
      steps,
      success: false,
      error,
    };
    setMigrationReport(report);
    console.error(error);
    return getDefaultState();
  };

  // Handle edge cases
  if (fromVersion < 1 || fromVersion > VERSION) {
    return failWithReport(
      `Unsupported state version ${fromVersion}. Resetting to default state.`,
    );
  }

  // Already at current version - just validate
  if (fromVersion === VERSION) {
    const result = AppStateSchema.safeParse(persistedState);
    if (!result.success) {
      return failWithReport(
        `Persisted state invalid. Resetting to default state. Error: ${result.error.message}`,
      );
    }
    // No migration needed, store an empty report
    const report: MigrationReport = {
      startVersion: fromVersion,
      endVersion: VERSION,
      initialState,
      steps: [],
      success: true,
    };
    setMigrationReport(report);
    return result.data;
  }

  let state: unknown = persistedState;
  let previousState: unknown = initialState;

  // Run migrations sequentially: v → v+1 → v+2 → ... → VERSION
  for (let v = fromVersion; v < VERSION; v++) {
    const migration = MIGRATIONS[v - 1]; // MIGRATIONS[0] = v1→v2, MIGRATIONS[1] = v2→v3, etc.

    if (!migration) {
      return failWithReport(
        `Missing migration from v${v} to v${v + 1}. Resetting to default state.`,
      );
    }

    // Validate input state before first migration
    if (v === fromVersion && !migration.fromSchema.safeParse(state).success) {
      return failWithReport(
        `Persisted state doesn't match v${v} schema. Resetting to default state.`,
      );
    }

    // Run the migration
    state = migration.migrate(state);

    // Generate diff and record the step
    const diff = generateDiff(previousState, state);
    const stateAfter = structuredClone(state);
    steps.push({
      fromVersion: v,
      toVersion: v + 1,
      description: migration.description,
      stateAfter,
      diff,
    });
    previousState = stateAfter;
  }

  // Validate final result
  const result = AppStateSchema.safeParse(state);
  if (!result.success) {
    return failWithReport(
      `Migration produced invalid state. Resetting to default state. Error: ${result.error.message}`,
    );
  }

  // Store successful report
  const report: MigrationReport = {
    startVersion: fromVersion,
    endVersion: VERSION,
    initialState,
    steps,
    success: true,
  };
  setMigrationReport(report);

  return result.data;
}

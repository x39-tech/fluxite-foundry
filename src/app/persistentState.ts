import * as StateV5 from "./persistentState/v5/state";
import {
  CHAIN_END_VERSION,
  getMigration,
  Migration,
} from "./persistentStateMigrations";
import {
  MigrationReport,
  MigrationStep,
  setMigrationReport,
  generateDiff,
} from "./migrationReport";

// When creating a new state version:
// 1. Export a snapshot of the outgoing version into persistentState/testdata/
//    (see docs/state-management.md); it can only be produced while that version
//    is still current.
// 2. Create a new vN/ directory with state.ts and migrate.ts
// 3. Import the new state module and migration function in persistentStateMigrations.ts
// 4. Add the new migration to the MIGRATIONS array in persistentStateMigrations.ts
// 5. Update the re-export and VERSION below to point to the new version

// Re-exports from the current (most recent) state version.
export * from "./persistentState/v5/state";
export const VERSION = StateV5.VERSION;

export type AppPersistentState = StateV5.AppPersistentState;
const AppStateSchema = StateV5.AppStateSchema;

if (CHAIN_END_VERSION !== VERSION) {
  throw new Error(
    `The migration chain ends at v${CHAIN_END_VERSION} but the current state version is v${VERSION}. ` +
      `Add the missing migration to persistentStateMigrations.ts.`,
  );
}

// Migration infrastructure

export function getDefaultState(): AppPersistentState {
  return {
    appSettings: {
      theme: "system",
      orgId: { type: "user", id: crypto.randomUUID() },
      locale: "en-US",
    },
    session: {
      openDocuments: [],
      selectedDocumentId: undefined,
      layouts: {},
    },
    documents: {},
  };
}

/**
 * Once a state parses at version N, migrations are typed functions and a
 * structurally wrong result is hard to produce. What types cannot catch is Zod
 * refinements (`z.int().nonnegative()` is just `number` to TypeScript), branded
 * types, which are casts, and object spread, which is not excess-checked.
 * Checking every intermediate result pins those to the step that produced them
 * instead of surfacing them as one opaque failure at the end.
 *
 * Only used in development and in tests.
 *
 * @returns a message naming the step, or undefined if the step is fine or was
 * not checked.
 */
function validateStepResult(
  migration: Migration,
  state: unknown,
): string | undefined {
  if (!import.meta.env.DEV) {
    return undefined;
  }

  const result = migration.toSchema.safeParse(state);
  if (result.success) {
    return undefined;
  }

  return (
    `Migration from v${migration.fromVersion} to v${migration.toVersion} produced state ` +
    `that does not match the v${migration.toVersion} schema. Error: ${result.error.message}`
  );
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
    const migration = getMigration(v);

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

    const stepError = validateStepResult(migration, state);

    // Generate diff and record the step
    const diff = generateDiff(previousState, state);
    const stateAfter = structuredClone(state);
    steps.push({
      fromVersion: v,
      toVersion: v + 1,
      description: migration.description,
      stateAfter,
      diff,
      error: stepError,
    });
    previousState = stateAfter;

    if (stepError) {
      return failWithReport(stepError);
    }
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

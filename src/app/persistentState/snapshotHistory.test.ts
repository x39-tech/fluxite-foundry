import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppStateSchema, migrateState, VERSION } from "app/persistentState";
import { getSchemaForVersion } from "app/persistentStateMigrations";
import { clearMigrationReport, getMigrationReport } from "app/migrationReport";
import { getSnapshotFor, SNAPSHOT_HISTORY } from "./testdata/snapshotHistory";

/**
 * Tests over the snapshot history. These test that a real document saved at any
 * version the app has ever written still opens.
 *
 * Where migrate.test.ts can be thought of as migration unit tests, these can be
 * thought of as integration tests for the same.
 */

// Every version the app has ever written state at, and could still be handed.
const historicalVersions = Array.from(
  { length: VERSION - 1 },
  (_, index) => index + 1,
);

describe("the state snapshot history", () => {
  beforeEach(() => {
    clearMigrationReport();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it.each(historicalVersions)("has a snapshot for v%i", (version) => {
    expect(getSnapshotFor(version)?.version).toBe(version);
  });

  it("is not empty", () => {
    expect(SNAPSHOT_HISTORY.length).toBeGreaterThan(0);
  });

  describe.each(SNAPSHOT_HISTORY)("$fileName", (entry) => {
    it("declares the version its file name claims", () => {
      expect(entry.snapshot.stateVersion).toBe(entry.version);
    });

    it("matches the schema of the version it was written at", () => {
      const schema = getSchemaForVersion(entry.version);
      expect(schema).toBeDefined();

      const result = schema!.safeParse(entry.snapshot.state);
      expect(result.error?.message ?? "valid").toBe("valid");
    });

    it("migrates to the current version", () => {
      const migrated = migrateState(entry.snapshot.state, entry.version);

      const report = getMigrationReport();
      expect(report?.error ?? "none").toBe("none");
      expect(report?.success).toBe(true);
      expect(AppStateSchema.safeParse(migrated).success).toBe(true);
    });

    it("keeps its documents through the migration", () => {
      const state = entry.snapshot.state as {
        deviceClassEditors: Record<string, unknown>;
      };
      const migrated = migrateState(entry.snapshot.state, entry.version);

      // Before v5, we had only `deviceClassEditors` instead of the current
      // `documents` discriminated union table.
      expect(Object.keys(migrated.documents)).toEqual(
        Object.keys(state.deviceClassEditors),
      );
    });
  });
});

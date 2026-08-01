import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getDefaultState, migrateState, VERSION } from "./persistentState";
import { clearMigrationReport, getMigrationReport } from "./migrationReport";
import { getMigration, MIGRATIONS } from "./persistentStateMigrations";

const createV1Editor = () => ({
  orgId: { type: "user", id: "test-user-id" },
  deviceClassId: "test-device",
  deviceClassVersion: "1.0.0",
  basicData: {
    publishDate: "2026-01-01",
    author: "Test",
    history: { "1.0.0": "Initial" },
    manufacturerName: "Fluxite",
    modelName: "Test Fixture",
    modelCategory: "lighting",
    modelSubcategory: "moving-wash",
    localized: { description: "loc-desc" },
  },
  libraries: {},
  parameterClasses: {},
  structureClasses: {},
  serializerClasses: {},
  resourceClasses: {},
  commandClasses: {},
  parameterEditors: ["param-fixed", "param-dynamic"],
  parameters: {
    "param-fixed": {
      codexId: "intensity",
      class: { type: "local", codexId: "intensity", id: "pc-1" },
      count: 3,
      access: ["write"],
      lifetime: "persistent",
      localized: { friendlyName: "loc-intensity" },
    },
    "param-dynamic": {
      codexId: "frame",
      class: { type: "local", codexId: "frame", id: "pc-2" },
      dynamicMinimum: 1,
      dynamicMaximum: 8,
      access: ["readActual", "write"],
      lifetime: "runtime",
      localized: { friendlyName: "loc-frame" },
    },
  },
  resourceEditors: [],
  resources: {},
  resourceAssets: {},
  commandEditors: [],
  commands: {},
  commandClassArguments: {},
  commandClassReturnValues: {},
  enumChoices: {},
  dmxSerializer: {
    chunks: { "chunk-1": { offsets: [0, 1] } },
    mappingGroups: {
      "group-1": {
        chunkId: "chunk-1",
        index: 0,
        mappings: [
          {
            mappedParam: { codexId: "intensity", index: 0 },
            ranges: [{ start: 0, end: 100, chunkStart: 0, chunkEnd: 255 }],
          },
        ],
      },
    },
    conditions: {},
  },
  localizations: {
    "loc-desc": { strings: { "en-US": "A fixture" }, items: [] },
  },
  windowLayout: "{}",
});

const createV1State = () => ({
  appSettings: {
    darkMode: true,
    orgId: { type: "user", id: "test-user-id" },
    locale: "en-US",
  },
  openEditors: {
    editors: [{ type: "deviceClass", id: "editor-1" }],
    selectedEditor: 0,
  },
  deviceClassEditors: { "editor-1": createV1Editor() },
});

// v2 differs from v1 only in that darkMode became a theme enum.
const createV2State = () => {
  const { appSettings, ...rest } = createV1State();
  return {
    ...rest,
    appSettings: {
      theme: "dark",
      orgId: appSettings.orgId,
      locale: appSettings.locale,
    },
  };
};

const stepVersions = () =>
  getMigrationReport()?.steps.map((step) => [step.fromVersion, step.toVersion]);

// migrateState walks one version at a time up to VERSION, so the steps are
// always consecutive from wherever it started. Derived rather than written out
// so that adding a state version doesn't require editing this file.
const consecutiveStepsFrom = (fromVersion: number) =>
  Array.from({ length: VERSION - fromVersion }, (_, i) => [
    fromVersion + i,
    fromVersion + i + 1,
  ]);

describe("MIGRATIONS", () => {
  it("has a migration for every version up to the current one", () => {
    expect(MIGRATIONS).toHaveLength(VERSION - 1);
  });
});

describe("migrateState", () => {
  beforeEach(() => {
    clearMigrationReport();
    // The failure paths log the reason; keep it out of the test output.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("when the state is already at the current version", () => {
    it("returns it unchanged and records an empty report", () => {
      const state = getDefaultState();

      expect(migrateState(state, VERSION)).toEqual(state);
      expect(getMigrationReport()).toMatchObject({
        startVersion: VERSION,
        endVersion: VERSION,
        steps: [],
        success: true,
      });
    });
  });

  describe("when the state is from an older version", () => {
    it("walks every version from the persisted one up to the current one", () => {
      migrateState(createV1State(), 1);

      expect(getMigrationReport()).toMatchObject({
        startVersion: 1,
        endVersion: VERSION,
        success: true,
      });
      expect(stepVersions()).toEqual(consecutiveStepsFrom(1));
    });

    it("starts from the given version rather than the beginning", () => {
      migrateState(createV2State(), 2);

      expect(getMigrationReport()?.success).toBe(true);
      expect(stepVersions()).toEqual(consecutiveStepsFrom(2));
    });

    it("records what each step did to the state", () => {
      migrateState(createV1State(), 1);
      const firstStep = getMigrationReport()?.steps[0];

      expect(firstStep?.diff).toBeDefined();
      expect(firstStep?.description).toBe(MIGRATIONS[0].description);
    });
  });

  describe("when the state cannot be migrated", () => {
    it("resets to default state when it does not match the starting schema", () => {
      const result = migrateState({ not: "a v1 state" }, 1);

      expect(result.deviceClassEditors).toEqual({});
      expect(getMigrationReport()).toMatchObject({ success: false });
      expect(getMigrationReport()?.error).toContain("doesn't match v1 schema");
    });

    it.each([0, -1, VERSION + 1])(
      "resets to default state for unsupported version %i",
      (fromVersion) => {
        const result = migrateState(createV1State(), fromVersion);

        expect(result.deviceClassEditors).toEqual({});
        expect(getMigrationReport()).toMatchObject({ success: false });
        expect(getMigrationReport()?.error).toContain(
          `Unsupported state version ${fromVersion}`,
        );
      },
    );

    it("keeps the unmigrated state in the report so the failure can be diagnosed", () => {
      const unmigratable = { not: "a v1 state" };

      migrateState(unmigratable, 1);

      expect(getMigrationReport()?.initialState).toEqual(unmigratable);
    });

    it("names the step that produced an invalid state", () => {
      const broken = getMigration(2);
      vi.spyOn(broken!, "migrate").mockImplementation((state) => ({
        ...(state as object),
        appSettings: "not an app settings object",
      }));

      migrateState(createV1State(), 1);

      const report = getMigrationReport();
      expect(report?.success).toBe(false);
      expect(report?.error).toContain("Migration from v2 to v3");

      const failedStep = report?.steps.at(-1);
      expect(failedStep?.fromVersion).toBe(2);
      expect(failedStep?.error).toBe(report?.error);
    });
  });
});

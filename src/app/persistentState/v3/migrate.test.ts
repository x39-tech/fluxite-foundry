import { describe, test, expect } from "vitest";
import { treeifyError } from "zod";
import { migrateV2toV3, migrateParameterCount } from "./migrate";
import * as V2 from "../v2/state";
import * as V3 from "./state";

const EDITOR_1 = "editor-1" as V3.EntityId;
const PARAM_1 = "param-1" as V3.EntityId;
const PARAM_FIXED = "param-fixed" as V3.EntityId;
const PARAM_DYNAMIC = "param-dynamic" as V3.EntityId;
const PARAM_NONE = "param-none" as V3.EntityId;

// Helper to create a minimal V2 parameter
function createV2Parameter(
  overrides: Partial<V2.Parameter> = {},
): V2.Parameter {
  return {
    codexId: "test-codex-id" as V2.CodexId,
    class: {
      type: "local",
      codexId: "test-class-codex-id" as V2.CodexId,
      id: "test-class-id" as V2.EntityId,
    },
    access: ["readActual"],
    lifetime: "runtime",
    localized: {
      friendlyName: "test-friendly-name" as V2.LocalizationKey,
    },
    ...overrides,
  };
}

// Helper to create a minimal V2 state with parameters
function createMinimalV2State(
  parameters: Record<string, V2.Parameter> = {},
): V2.AppPersistentState {
  return {
    appSettings: {
      theme: "dark",
      orgId: { type: "user", id: "test-user-id" },
      locale: "en-US",
    },
    openEditors: {
      editors: [],
      selectedEditor: -1,
    },
    deviceClassEditors: {
      "editor-1": {
        orgId: { type: "user", id: "test-user-id" },
        deviceClassId: "test-device-class",
        deviceClassVersion: "1.0.0",
        basicData: {
          publishDate: "2024-01-01",
          author: "Test Author",
          history: {},
          manufacturerName: "Test Manufacturer",
          modelName: "Test Model",
          modelCategory: "lighting",
          modelSubcategory: "fixed-profile",
          localized: {
            description: "test-description" as V2.LocalizationKey,
          },
        },
        libraries: {},
        parameterClasses: {},
        structureClasses: {},
        serializerClasses: {},
        resourceClasses: {},
        commandClasses: {},
        parameterEditors: [],
        parameters,
        resourceEditors: [],
        resources: {},
        resourceAssets: {},
        commandEditors: [],
        commands: {},
        commandClassArguments: {},
        commandClassReturnValues: {},
        enumChoices: {},
        localizations: {},
        windowLayout: "{}",
      },
    },
  };
}

describe("migrateParameterCount", () => {
  describe("fixed count", () => {
    test("converts fixed count to discriminated union", () => {
      const result = migrateParameterCount(5, undefined, undefined);
      expect(result).toEqual({ type: "fixed", value: 5 });
    });

    test("fixed count takes precedence over dynamic values", () => {
      const result = migrateParameterCount(5, 1, 10);
      expect(result).toEqual({ type: "fixed", value: 5 });
    });

    test("handles zero fixed count", () => {
      const result = migrateParameterCount(0, undefined, undefined);
      expect(result).toEqual({ type: "fixed", value: 0 });
    });
  });

  describe("dynamic count", () => {
    test("converts dynamicMinimum and dynamicMaximum to dynamic count", () => {
      const result = migrateParameterCount(undefined, 1, 10);
      expect(result).toEqual({ type: "dynamic", min: 1, max: 10 });
    });

    test("handles only dynamicMinimum (no max)", () => {
      const result = migrateParameterCount(undefined, 3, undefined);
      expect(result).toEqual({ type: "dynamic", min: 3, max: undefined });
    });

    test("handles only dynamicMaximum (defaults min to 0)", () => {
      const result = migrateParameterCount(undefined, undefined, 10);
      expect(result).toEqual({ type: "dynamic", min: 0, max: 10 });
    });

    test("handles zero min and max", () => {
      const result = migrateParameterCount(undefined, 0, 0);
      expect(result).toEqual({ type: "dynamic", min: 0, max: 0 });
    });
  });

  describe("edge cases - invalid V2 data coercion", () => {
    test("clamps negative dynamicMinimum to 0", () => {
      const result = migrateParameterCount(undefined, -5, 10);
      expect(result).toEqual({ type: "dynamic", min: 0, max: 10 });
    });

    test("clamps negative dynamicMaximum to 0", () => {
      const result = migrateParameterCount(undefined, 0, -5);
      expect(result).toEqual({ type: "dynamic", min: 0, max: 0 });
    });

    test("truncates fractional dynamicMinimum", () => {
      const result = migrateParameterCount(undefined, 2.7, 10);
      expect(result).toEqual({ type: "dynamic", min: 2, max: 10 });
    });

    test("truncates fractional dynamicMaximum", () => {
      const result = migrateParameterCount(undefined, 1, 5.9);
      expect(result).toEqual({ type: "dynamic", min: 1, max: 5 });
    });

    test("truncates negative fractional values correctly", () => {
      const result = migrateParameterCount(undefined, -2.7, 10);
      // Math.trunc(-2.7) = -2, then Math.max(0, -2) = 0
      expect(result).toEqual({ type: "dynamic", min: 0, max: 10 });
    });

    test("swaps min and max when min > max after coercion", () => {
      const result = migrateParameterCount(undefined, 10, 5);
      expect(result).toEqual({ type: "dynamic", min: 5, max: 10 });
    });

    test("swaps min and max with fractional values", () => {
      // 10.9 truncates to 10, 5.1 truncates to 5, then 10 > 5 so swap
      const result = migrateParameterCount(undefined, 10.9, 5.1);
      expect(result).toEqual({ type: "dynamic", min: 5, max: 10 });
    });
  });

  describe("undefined handling", () => {
    test("returns undefined when all inputs are undefined", () => {
      const result = migrateParameterCount(undefined, undefined, undefined);
      expect(result).toBeUndefined();
    });
  });
});

describe("migrateV2toV3", () => {
  test("preserves appSettings", () => {
    const v2State = createMinimalV2State();
    const v3State = migrateV2toV3(v2State);

    expect(v3State.appSettings).toEqual(v2State.appSettings);
  });

  test("preserves openEditors", () => {
    const v2State = createMinimalV2State();
    const v3State = migrateV2toV3(v2State);

    expect(v3State.openEditors).toEqual(v2State.openEditors);
  });

  test("migrates parameter with fixed count", () => {
    const v2State = createMinimalV2State({
      [PARAM_1]: createV2Parameter({ count: 3 }),
    });
    const v3State = migrateV2toV3(v2State);

    const param = v3State.deviceClassEditors[EDITOR_1].parameters[PARAM_1];
    expect(param.count).toEqual({ type: "fixed", value: 3 });
  });

  test("migrates parameter with dynamic count", () => {
    const v2State = createMinimalV2State({
      [PARAM_1]: createV2Parameter({ dynamicMinimum: 1, dynamicMaximum: 5 }),
    });
    const v3State = migrateV2toV3(v2State);

    const param = v3State.deviceClassEditors[EDITOR_1].parameters[PARAM_1];
    expect(param.count).toEqual({ type: "dynamic", min: 1, max: 5 });
  });

  test("migrates parameter with no count (undefined)", () => {
    const v2State = createMinimalV2State({
      [PARAM_1]: createV2Parameter(),
    });
    const v3State = migrateV2toV3(v2State);

    const param = v3State.deviceClassEditors[EDITOR_1].parameters[PARAM_1];
    expect(param.count).toBeUndefined();
  });

  test("preserves other parameter properties during migration", () => {
    const v2State = createMinimalV2State({
      [PARAM_1]: createV2Parameter({
        count: 2,
        minimum: 0,
        maximum: 100,
        default: 50,
        wrapping: true,
        atomicIdentifier: "test-atomic",
      }),
    });
    const v3State = migrateV2toV3(v2State);

    const param = v3State.deviceClassEditors[EDITOR_1].parameters[PARAM_1];
    expect(param.minimum).toBe(0);
    expect(param.maximum).toBe(100);
    expect(param.default).toBe(50);
    expect(param.wrapping).toBe(true);
    expect(param.atomicIdentifier).toBe("test-atomic");
  });

  test("removes dynamicMinimum and dynamicMaximum from migrated parameters", () => {
    const v2State = createMinimalV2State({
      [PARAM_1]: createV2Parameter({ dynamicMinimum: 1, dynamicMaximum: 5 }),
    });
    const v3State = migrateV2toV3(v2State);

    const param = v3State.deviceClassEditors[EDITOR_1].parameters[PARAM_1];
    expect(param).not.toHaveProperty("dynamicMinimum");
    expect(param).not.toHaveProperty("dynamicMaximum");
    expect(param.count!.type).toBe("dynamic");
    if (param.count?.type === "dynamic") {
      expect(param.count.min).toBe(1);
      expect(param.count.max).toBe(5);
    }
  });

  test("handles multiple parameters in same editor", () => {
    const v2State = createMinimalV2State({
      [PARAM_FIXED]: createV2Parameter({ count: 2 }),
      [PARAM_DYNAMIC]: createV2Parameter({
        dynamicMinimum: 0,
        dynamicMaximum: 10,
      }),
      [PARAM_NONE]: createV2Parameter(),
    });
    const v3State = migrateV2toV3(v2State);

    const params = v3State.deviceClassEditors[EDITOR_1].parameters;
    expect(params[PARAM_FIXED].count).toEqual({ type: "fixed", value: 2 });
    expect(params[PARAM_DYNAMIC].count).toEqual({
      type: "dynamic",
      min: 0,
      max: 10,
    });
    expect(params[PARAM_NONE].count).toBeUndefined();
  });

  test("handles empty deviceClassEditors", () => {
    const v2State: V2.AppPersistentState = {
      appSettings: {
        theme: "light",
        orgId: { type: "user", id: "test" },
        locale: "en-US",
      },
      openEditors: { editors: [], selectedEditor: -1 },
      deviceClassEditors: {},
    };
    const v3State = migrateV2toV3(v2State);

    expect(v3State).toEqual(v2State);
  });

  test("handles editor with empty parameters", () => {
    const v2State = createMinimalV2State({});
    const v3State = migrateV2toV3(v2State);

    expect(v3State).toEqual(v2State);
  });

  test("preserves non-parameter editor properties", () => {
    const v2State = createMinimalV2State({
      [PARAM_1]: createV2Parameter({ count: 1 }),
    });
    const v3State = migrateV2toV3(v2State);

    const editor = v3State.deviceClassEditors[EDITOR_1];
    expect(editor.deviceClassId).toBe("test-device-class");
    expect(editor.deviceClassVersion).toBe("1.0.0");
    expect(editor.basicData.modelName).toBe("Test Model");
    expect(editor.windowLayout).toBe("{}");
  });

  test("produces valid V3 state", () => {
    const v2State = createMinimalV2State({
      [PARAM_FIXED]: createV2Parameter({ count: 2 }),
      [PARAM_DYNAMIC]: createV2Parameter({
        dynamicMinimum: 1,
        dynamicMaximum: 5,
      }),
      [PARAM_NONE]: createV2Parameter(),
    });
    const v3State = migrateV2toV3(v2State);

    const result = V3.AppStateSchema.safeParse(v3State);
    if (!result.success) {
      console.error(treeifyError(result.error));
    }
    expect(result.success).toBe(true);
  });

  test("produces valid V3 state with edge case coercion", () => {
    const v2State = createMinimalV2State({
      [PARAM_1]: createV2Parameter({
        dynamicMinimum: -5.5,
        dynamicMaximum: 10.9,
      }),
    });
    const v3State = migrateV2toV3(v2State);

    const result = V3.AppStateSchema.safeParse(v3State);
    expect(result.success).toBe(true);

    // Verify the coerced values
    const param = v3State.deviceClassEditors[EDITOR_1].parameters[PARAM_1];
    expect(param.count).toEqual({ type: "dynamic", min: 0, max: 10 });
  });

  describe("DMX serializer migration", () => {
    const CHUNK_1 = "chunk-1" as V2.EntityId;
    const CHUNK_2 = "chunk-2" as V2.EntityId;
    const MAPPING_GROUP_1 = "mg-1" as V2.EntityId;
    const MAPPING_GROUP_2 = "mg-2" as V2.EntityId;
    const CONDITION_1 = "cond-1" as V2.EntityId;

    function createV2DmxSerializer(): V2.DmxSerializerState {
      return {
        chunks: {
          [CHUNK_1]: { offsets: [0, 1, 2] },
          [CHUNK_2]: { offsets: [3, 4] },
        },
        mappingGroups: {
          [MAPPING_GROUP_1]: {
            chunkId: CHUNK_1,
            index: 0,
            mappings: [
              {
                mappedParam: {
                  codexId: "intensity" as V2.CodexId,
                  index: 0,
                },
                ranges: [
                  { start: 0, end: 1, chunkStart: 0, chunkEnd: 255 },
                  {
                    start: undefined,
                    end: 0.5,
                    chunkStart: 100,
                    chunkEnd: 200,
                  },
                ],
                unmappedParams: [
                  {
                    parameter: { codexId: "pan" as V2.CodexId },
                    start: 0,
                    end: 1,
                  },
                ],
              },
            ],
          },
          [MAPPING_GROUP_2]: {
            chunkId: CHUNK_2,
            index: 0,
            mappings: [],
          },
        },
        conditions: {
          [CONDITION_1]: {
            conditionType: "chunkRef",
            parent: { type: "mappingGroup", id: MAPPING_GROUP_1 },
            chunkId: CHUNK_1,
            chunkStart: 0,
            chunkEnd: 127,
          },
        },
      };
    }

    function createV2StateWithDmx(
      dmxSerializer: V2.DmxSerializerState,
    ): V2.AppPersistentState {
      const state = createMinimalV2State({});
      state.deviceClassEditors["editor-1"].dmxSerializer = dmxSerializer;
      return state;
    }

    test("migrates DmxMappingRange chunkStart/chunkEnd to chunkValues", () => {
      const v2State = createV2StateWithDmx(createV2DmxSerializer());
      const v3State = migrateV2toV3(v2State);

      const mappingGroup =
        v3State.deviceClassEditors[EDITOR_1].dmxSerializer?.mappingGroups[
          MAPPING_GROUP_1
        ];
      expect(mappingGroup).toBeDefined();

      const range = mappingGroup!.mappings[0].ranges[0];
      expect(range.chunkValues).toEqual({
        type: "range",
        chunkStart: 0,
        chunkEnd: 255,
      });
      expect(range.start).toBe(0);
      expect(range.end).toBe(1);
      expect(range).not.toHaveProperty("chunkStart");
      expect(range).not.toHaveProperty("chunkEnd");
    });

    test("migrates multiple ranges correctly", () => {
      const v2State = createV2StateWithDmx(createV2DmxSerializer());
      const v3State = migrateV2toV3(v2State);

      const ranges =
        v3State.deviceClassEditors[EDITOR_1].dmxSerializer?.mappingGroups[
          MAPPING_GROUP_1
        ]?.mappings[0].ranges;

      expect(ranges).toHaveLength(2);
      expect(ranges![0].chunkValues).toEqual({
        type: "range",
        chunkStart: 0,
        chunkEnd: 255,
      });
      expect(ranges![1].chunkValues).toEqual({
        type: "range",
        chunkStart: 100,
        chunkEnd: 200,
      });
    });

    test("adds empty triggers array to migrated mapping groups", () => {
      const v2State = createV2StateWithDmx(createV2DmxSerializer());
      const v3State = migrateV2toV3(v2State);

      const mg1 =
        v3State.deviceClassEditors[EDITOR_1].dmxSerializer?.mappingGroups[
          MAPPING_GROUP_1
        ];
      const mg2 =
        v3State.deviceClassEditors[EDITOR_1].dmxSerializer?.mappingGroups[
          MAPPING_GROUP_2
        ];

      expect(mg1?.triggers).toEqual([]);
      expect(mg2?.triggers).toEqual([]);
    });

    test("preserves unmappedParams in mappings", () => {
      const v2State = createV2StateWithDmx(createV2DmxSerializer());
      const v3State = migrateV2toV3(v2State);

      const unmappedParams =
        v3State.deviceClassEditors[EDITOR_1].dmxSerializer?.mappingGroups[
          MAPPING_GROUP_1
        ]?.mappings[0].unmappedParams;

      expect(unmappedParams).toHaveLength(1);
      expect(unmappedParams![0].parameter.codexId).toBe("pan");
    });

    test("preserves chunks unchanged", () => {
      const v2State = createV2StateWithDmx(createV2DmxSerializer());
      const v3State = migrateV2toV3(v2State);

      const chunks = v3State.deviceClassEditors[EDITOR_1].dmxSerializer?.chunks;
      expect(chunks?.[CHUNK_1]).toEqual({ offsets: [0, 1, 2] });
      expect(chunks?.[CHUNK_2]).toEqual({ offsets: [3, 4] });
    });

    test("preserves conditions unchanged", () => {
      const v2State = createV2StateWithDmx(createV2DmxSerializer());
      const v3State = migrateV2toV3(v2State);

      const conditions =
        v3State.deviceClassEditors[EDITOR_1].dmxSerializer?.conditions;
      expect(conditions?.[CONDITION_1]).toEqual({
        conditionType: "chunkRef",
        parent: { type: "mappingGroup", id: MAPPING_GROUP_1 },
        chunkId: CHUNK_1,
        chunkStart: 0,
        chunkEnd: 127,
      });
    });

    test("handles undefined dmxSerializer", () => {
      const v2State = createMinimalV2State({});
      const v3State = migrateV2toV3(v2State);

      expect(
        v3State.deviceClassEditors[EDITOR_1].dmxSerializer,
      ).toBeUndefined();
    });

    test("handles empty mappingGroups", () => {
      const v2Dmx: V2.DmxSerializerState = {
        chunks: { [CHUNK_1]: { offsets: [0] } },
        mappingGroups: {},
        conditions: {},
      };
      const v2State = createV2StateWithDmx(v2Dmx);
      const v3State = migrateV2toV3(v2State);

      expect(
        v3State.deviceClassEditors[EDITOR_1].dmxSerializer?.mappingGroups,
      ).toEqual({});
    });

    test("produces valid V3 state with DMX serializer", () => {
      const v2State = createV2StateWithDmx(createV2DmxSerializer());
      const v3State = migrateV2toV3(v2State);

      const result = V3.AppStateSchema.safeParse(v3State);
      if (!result.success) {
        console.error(treeifyError(result.error));
      }
      expect(result.success).toBe(true);
    });
  });
});

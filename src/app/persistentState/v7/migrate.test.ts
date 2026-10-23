import { describe, test, expect } from "vitest";
import { treeifyError } from "zod";
import { migrateV6toV7 } from "./migrate";
import * as V6 from "../v6/state";
import * as V7 from "./state";

const DOC_ID = V6.EntityId("doc1");
const PARAM_ID = V6.EntityId("param1");
const GROUP_ID = V6.EntityId("group1");
const CHUNK_ID = V6.EntityId("chunk1");

function createV6State(
  doc: Partial<V6.DeviceClassDocument> = {},
): V6.AppPersistentState {
  return {
    appSettings: {
      theme: "dark",
      orgId: { type: "user", id: "test-user-id" },
      authoringLocale: "en-US",
      uiLocale: "system",
    },
    session: {
      openDocuments: [DOC_ID],
      selectedDocumentId: DOC_ID,
      layouts: {},
    },
    documents: {
      [DOC_ID]: {
        type: "deviceClass",
        orgId: { type: "user", id: "test-user-id" },
        sourceLocale: "en-US",
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
          localized: { description: V6.LocalizationKey("desc") },
        },
        libraries: {},
        parameterClasses: {},
        structureClasses: {},
        serializerClasses: {},
        resourceClasses: {},
        commandClasses: {},
        parameterEditors: [PARAM_ID],
        parameters: {
          [PARAM_ID]: {
            codexId: V6.CodexId("intensity"),
            class: {
              type: "imported",
              library: "core",
              codexId: V6.CodexId("intensity"),
            },
            access: ["write"],
            lifetime: "runtime",
            default: 0.5,
            localized: {},
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
        localizations: {
          [V6.LocalizationKey("desc")]: {
            strings: V6.LocalizationDbSchema.parse({ "en-US": "A device" }),
          },
        },
        ...doc,
      },
    },
  } as V6.AppPersistentState;
}

function createV6Dmx(mapping: V6.DmxMapping): V6.DmxSerializerState {
  return {
    chunks: { [CHUNK_ID]: { offsets: [1] } },
    mappingGroups: {
      [GROUP_ID]: {
        chunkId: CHUNK_ID,
        index: 0,
        mappings: [mapping],
        triggers: [],
      },
    },
    conditions: {},
  };
}

function migratedDmx(state: V6.AppPersistentState): V7.DmxSerializer[] {
  return Object.values(migrateV6toV7(state).documents[DOC_ID].dmxSerializers);
}

function migratedMapping(state: V6.AppPersistentState): V7.DmxMapping {
  return migratedDmx(state)[0].mappingGroups[GROUP_ID].mappings[0];
}

const RANGE_CHUNK_VALUES = {
  type: "range",
  chunkStart: 0,
  chunkEnd: 255,
} as const;

describe("migrateV6toV7", () => {
  test("turns an absent mapping range start into null bounds", () => {
    const state = createV6State({
      dmxSerializer: createV6Dmx({
        mappedParam: { id: PARAM_ID },
        ranges: [{ end: 1, chunkValues: RANGE_CHUNK_VALUES }],
      }),
    });

    expect(migratedMapping(state).ranges[0]).toEqual({
      bounds: { type: "null" },
      chunkValues: RANGE_CHUNK_VALUES,
    });
  });

  test("turns an absent unmapped parameter start into null bounds", () => {
    const state = createV6State({
      dmxSerializer: createV6Dmx({
        mappedParam: { id: PARAM_ID },
        ranges: [],
        unmappedParams: [{ parameter: { id: V6.EntityId("other") } }],
      }),
    });

    expect(migratedMapping(state).unmappedParams).toEqual([
      { parameter: { id: V6.EntityId("other") }, bounds: { type: "null" } },
    ]);
  });

  test("tags bounds that were set with their type, including false and zero", () => {
    const state = createV6State({
      dmxSerializer: createV6Dmx({
        mappedParam: { id: PARAM_ID },
        ranges: [
          { start: 0, end: 1, chunkValues: RANGE_CHUNK_VALUES },
          { start: false, chunkValues: RANGE_CHUNK_VALUES },
        ],
        unmappedParams: [{ parameter: { id: PARAM_ID }, start: 3 }],
      }),
    });

    const mapping = migratedMapping(state);

    expect(mapping.ranges.map((r) => r.bounds)).toEqual([
      { type: "numeric", start: 0, end: 1 },
      { type: "bool", start: false },
    ]);
    expect(mapping.unmappedParams?.[0].bounds).toEqual({
      type: "numeric",
      start: 3,
    });
  });

  test("drops an end whose type does not match the start", () => {
    const state = createV6State({
      dmxSerializer: createV6Dmx({
        mappedParam: { id: PARAM_ID },
        ranges: [{ start: 1, end: true, chunkValues: RANGE_CHUNK_VALUES }],
      }),
    });

    expect(migratedMapping(state).ranges[0].bounds).toEqual({
      type: "numeric",
      start: 1,
    });
  });

  test("moves the DMX serializer into the serializer table as dmx, read-only and static", () => {
    const state = createV6State({
      dmxSerializer: createV6Dmx({ mappedParam: { id: PARAM_ID }, ranges: [] }),
    });

    const serializers = migratedDmx(state);

    expect(serializers).toHaveLength(1);
    expect(serializers[0]).toMatchObject({
      codexId: "dmx",
      access: ["read"],
      lifetime: "static",
      chunks: { [CHUNK_ID]: { offsets: [1] } },
      conditions: {},
    });
    expect(Object.keys(serializers[0].mappingGroups)).toEqual([GROUP_ID]);
  });

  test("gives a document without a DMX serializer an empty serializer table", () => {
    const result = migrateV6toV7(createV6State());

    expect(result.documents[DOC_ID].dmxSerializers).toEqual({});
    expect(result.documents[DOC_ID]).not.toHaveProperty("dmxSerializer");
  });

  test("tags existing parameter defaults with their type", () => {
    const state = createV6State();
    const param = state.documents[DOC_ID].parameters[PARAM_ID];
    state.documents[DOC_ID].parameters[V6.EntityId("param2")] = {
      ...param,
      default: false,
    };

    const { parameters } = migrateV6toV7(state).documents[DOC_ID];

    expect(parameters[PARAM_ID].default).toEqual({
      type: "numeric",
      value: 0.5,
    });
    expect(parameters[V6.EntityId("param2")].default).toEqual({
      type: "bool",
      value: false,
    });
  });

  test("leaves parameters without a default without one", () => {
    const state = createV6State();
    delete state.documents[DOC_ID].parameters[PARAM_ID].default;

    const result = migrateV6toV7(state);

    expect(result.documents[DOC_ID].parameters[PARAM_ID]).not.toHaveProperty(
      "default",
    );
  });

  test("preserves settings and session untouched", () => {
    const state = createV6State();

    const result = migrateV6toV7(state);

    expect(result.appSettings).toEqual(state.appSettings);
    expect(result.session).toEqual(state.session);
  });

  test("produces a state that validates against the V7 schema", () => {
    const result = migrateV6toV7(
      createV6State({
        dmxSerializer: createV6Dmx({
          mappedParam: { id: PARAM_ID },
          ranges: [{ chunkValues: RANGE_CHUNK_VALUES }],
          unmappedParams: [{ parameter: { id: PARAM_ID } }],
        }),
      }),
    );

    const parsed = V7.AppStateSchema.safeParse(result);

    expect(
      parsed.success ? undefined : treeifyError(parsed.error),
    ).toBeUndefined();
  });
});

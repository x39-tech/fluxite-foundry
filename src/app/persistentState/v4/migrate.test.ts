import { describe, test, expect } from "vitest";
import { treeifyError } from "zod";
import { migrateV3toV4 } from "./migrate";
import * as V3 from "../v3/state";
import * as V4 from "./state";

// Builds a minimal V3 editor. Callers override the fields relevant to the
// reference they are testing. Overrides are loosely typed so tests can use
// plain string keys for the EntityId-keyed record fields.
function createV3Editor(
  overrides: {
    [K in keyof V3.DeviceClassEditorState]?: unknown;
  } = {},
): V3.DeviceClassEditorState {
  return {
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
        description: "test-description" as V3.LocalizationKey,
      },
    },
    libraries: {},
    parameterClasses: {},
    structureClasses: {},
    serializerClasses: {},
    resourceClasses: {},
    commandClasses: {},
    parameterEditors: [],
    parameters: {},
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
    ...overrides,
  } as V3.DeviceClassEditorState;
}

function createV3State(
  editor: V3.DeviceClassEditorState,
): V3.AppPersistentState {
  return {
    appSettings: {
      theme: "dark",
      orgId: { type: "user", id: "test-user-id" },
      locale: "en-US",
    },
    openEditors: { editors: [], selectedEditor: -1 },
    deviceClassEditors: { ["editor-1" as V3.EntityId]: editor },
  };
}

function migratedEditor(
  editor: V3.DeviceClassEditorState,
): V4.DeviceClassEditorState {
  return migrateV3toV4(createV3State(editor)).deviceClassEditors[
    "editor-1" as V4.EntityId
  ];
}

function localParam(
  codexId: string,
  classId: string,
  extra: Partial<V3.Parameter> = {},
): V3.Parameter {
  return {
    codexId: codexId as V3.CodexId,
    class: {
      type: "local",
      codexId: "cls" as V3.CodexId,
      id: classId as V3.EntityId,
    },
    access: ["readActual"],
    lifetime: "runtime",
    localized: {},
    ...extra,
  };
}

describe("migrateV3toV4 - ParameterReference", () => {
  test("resolves a mapped parameter codexId to its EntityId", () => {
    const editor = createV3Editor({
      parameters: { "param-entity": localParam("intensity", "pc-1") },
      dmxSerializer: {
        chunks: { "chunk-1": { offsets: [0] } },
        mappingGroups: {
          "mg-1": {
            chunkId: "chunk-1" as V3.EntityId,
            index: 0,
            mappings: [
              {
                mappedParam: { codexId: "intensity" as V3.CodexId },
                ranges: [],
              },
            ],
            triggers: [],
          },
        },
        conditions: {},
      },
    });

    const result = migratedEditor(editor);
    const ref =
      result.dmxSerializer!.mappingGroups["mg-1" as V4.EntityId].mappings[0]
        .mappedParam;
    expect(ref.id).toBe("param-entity");
  });

  test("preserves the index on an indexed reference", () => {
    const editor = createV3Editor({
      parameters: { "param-entity": localParam("frame", "pc-1") },
      dmxSerializer: {
        chunks: { "chunk-1": { offsets: [0] } },
        mappingGroups: {
          "mg-1": {
            chunkId: "chunk-1" as V3.EntityId,
            index: 0,
            mappings: [
              {
                mappedParam: { codexId: "frame" as V3.CodexId, index: 2 },
                ranges: [],
              },
            ],
            triggers: [],
          },
        },
        conditions: {},
      },
    });

    const ref =
      migratedEditor(editor).dmxSerializer!.mappingGroups["mg-1" as V4.EntityId]
        .mappings[0].mappedParam;
    expect(ref.id).toBe("param-entity");
    expect(ref.index).toBe(2);
  });

  test("keeps a dangling reference's codexId verbatim", () => {
    const editor = createV3Editor({
      parameters: {},
      dmxSerializer: {
        chunks: { "chunk-1": { offsets: [0] } },
        mappingGroups: {
          "mg-1": {
            chunkId: "chunk-1" as V3.EntityId,
            index: 0,
            mappings: [
              {
                mappedParam: { codexId: "gone" as V3.CodexId },
                ranges: [],
              },
            ],
            triggers: [],
          },
        },
        conditions: {},
      },
    });

    const ref =
      migratedEditor(editor).dmxSerializer!.mappingGroups["mg-1" as V4.EntityId]
        .mappings[0].mappedParam;
    expect(ref.id).toBe("gone");
  });

  test("resolves unmapped parameter references", () => {
    const editor = createV3Editor({
      parameters: {
        "p-mapped": localParam("intensity", "pc-1"),
        "p-unmapped": localParam("pan", "pc-1"),
      },
      dmxSerializer: {
        chunks: { "chunk-1": { offsets: [0] } },
        mappingGroups: {
          "mg-1": {
            chunkId: "chunk-1" as V3.EntityId,
            index: 0,
            mappings: [
              {
                mappedParam: { codexId: "intensity" as V3.CodexId },
                ranges: [],
                unmappedParams: [
                  { parameter: { codexId: "pan" as V3.CodexId } },
                ],
              },
            ],
            triggers: [],
          },
        },
        conditions: {},
      },
    });

    const up =
      migratedEditor(editor).dmxSerializer!.mappingGroups["mg-1" as V4.EntityId]
        .mappings[0].unmappedParams![0].parameter;
    expect(up.id).toBe("p-unmapped");
  });
});

describe("migrateV3toV4 - Parameter.enumExclusions", () => {
  function editorWithLocalChoice(): V3.DeviceClassEditorState {
    return createV3Editor({
      parameters: { "param-entity": localParam("intensity", "pc-1") },
      enumChoices: {
        "choice-entity": {
          parent: { type: "paramClass", id: "pc-1" as V3.EntityId },
          codexId: "red" as V3.CodexId,
          index: 0,
          localized: { name: "n" as V3.LocalizationKey },
        },
      },
    });
  }

  test("resolves a local class choice exclusion to the choice EntityId", () => {
    const editor = editorWithLocalChoice();
    editor.parameters["param-entity" as V3.EntityId].enumExclusions = [
      "red" as V3.CodexId,
    ];

    const migrated = migratedEditor(editor);
    expect(
      migrated.parameters["param-entity" as V4.EntityId].enumExclusions,
    ).toEqual(["choice-entity"]);
  });

  test("keeps an imported class exclusion as a codexId", () => {
    const editor = createV3Editor({
      parameters: {
        "param-entity": {
          codexId: "intensity" as V3.CodexId,
          class: {
            type: "imported",
            library: "lib",
            codexId: "cls" as V3.CodexId,
          },
          access: ["readActual"],
          lifetime: "runtime",
          enumExclusions: ["red" as V3.CodexId],
          localized: {},
        },
      },
    });

    const migrated = migratedEditor(editor);
    expect(
      migrated.parameters["param-entity" as V4.EntityId].enumExclusions,
    ).toEqual(["red"]);
  });

  test("keeps an unresolvable local exclusion as its original codexId", () => {
    const editor = editorWithLocalChoice();
    editor.parameters["param-entity" as V3.EntityId].enumExclusions = [
      "missingChoice" as V3.CodexId,
    ];

    const migrated = migratedEditor(editor);
    expect(
      migrated.parameters["param-entity" as V4.EntityId].enumExclusions,
    ).toEqual(["missingChoice"]);
  });
});

describe("migrateV3toV4 - Command.argEnumExclusions", () => {
  test("resolves local argument keys and choice values to EntityIds", () => {
    const editor = createV3Editor({
      commands: {
        "cmd-entity": {
          codexId: "configure" as V3.CodexId,
          class: {
            type: "local",
            codexId: "cmdcls" as V3.CodexId,
            id: "cc-1" as V3.EntityId,
          },
          completionNotification: false,
          argEnumExclusions: {
            ["mode" as V3.CodexId]: ["disabled" as V3.CodexId],
          },
          localized: {},
        },
      },
      commandClassArguments: {
        "arg-entity": {
          parentId: "cc-1" as V3.EntityId,
          codexId: "mode" as V3.CodexId,
          dataType: "enum",
          required: true,
          localized: { name: "n" as V3.LocalizationKey },
        },
      },
      enumChoices: {
        "choice-entity": {
          parent: { type: "cmdClassArg", id: "arg-entity" as V3.EntityId },
          codexId: "disabled" as V3.CodexId,
          index: 0,
          localized: { name: "n" as V3.LocalizationKey },
        },
      },
    });

    const migrated = migratedEditor(editor);
    expect(
      migrated.commands["cmd-entity" as V4.EntityId].argEnumExclusions,
    ).toEqual({
      "arg-entity": ["choice-entity"],
    });
  });

  test("keeps imported argument exclusions as codexIds", () => {
    const editor = createV3Editor({
      commands: {
        "cmd-entity": {
          codexId: "configure" as V3.CodexId,
          class: {
            type: "imported",
            library: "lib",
            codexId: "cmdcls" as V3.CodexId,
          },
          completionNotification: false,
          argEnumExclusions: {
            ["mode" as V3.CodexId]: ["disabled" as V3.CodexId],
          },
          localized: {},
        },
      },
    });

    const migrated = migratedEditor(editor);
    expect(
      migrated.commands["cmd-entity" as V4.EntityId].argEnumExclusions,
    ).toEqual({
      mode: ["disabled"],
    });
  });
});

describe("migrateV3toV4 - DmxTrigger", () => {
  test("resolves the command reference and local condition keys", () => {
    const editor = createV3Editor({
      commands: {
        "cmd-entity": {
          codexId: "reset" as V3.CodexId,
          class: {
            type: "local",
            codexId: "cmdcls" as V3.CodexId,
            id: "cc-1" as V3.EntityId,
          },
          completionNotification: false,
          localized: {},
        },
      },
      commandClassArguments: {
        "arg-entity": {
          parentId: "cc-1" as V3.EntityId,
          codexId: "mode" as V3.CodexId,
          dataType: "enum",
          required: true,
          localized: { name: "n" as V3.LocalizationKey },
        },
      },
      dmxSerializer: {
        chunks: { "chunk-1": { offsets: [0] } },
        mappingGroups: {
          "mg-1": {
            chunkId: "chunk-1" as V3.EntityId,
            index: 0,
            mappings: [],
            triggers: [
              {
                command: "reset" as V3.CodexId,
                mappings: [
                  {
                    conditions: {
                      ["mode" as V3.CodexId]: { argumentMin: 1 },
                    },
                    sequence: [],
                  },
                ],
              },
            ],
          },
        },
        conditions: {},
      },
    });

    const trigger =
      migratedEditor(editor).dmxSerializer!.mappingGroups["mg-1" as V4.EntityId]
        .triggers[0];
    expect(trigger.command).toBe("cmd-entity");
    expect(trigger.mappings[0].conditions).toEqual({
      "arg-entity": { argumentMin: 1 },
    });
  });

  test("keeps a dangling trigger command and its codexId condition keys verbatim", () => {
    const editor = createV3Editor({
      commands: {},
      dmxSerializer: {
        chunks: { "chunk-1": { offsets: [0] } },
        mappingGroups: {
          "mg-1": {
            chunkId: "chunk-1" as V3.EntityId,
            index: 0,
            mappings: [],
            triggers: [
              {
                command: "gone" as V3.CodexId,
                mappings: [
                  {
                    conditions: {
                      ["mode" as V3.CodexId]: { argumentMin: 1 },
                    },
                    sequence: [],
                  },
                ],
              },
            ],
          },
        },
        conditions: {},
      },
    });

    const trigger =
      migratedEditor(editor).dmxSerializer!.mappingGroups["mg-1" as V4.EntityId]
        .triggers[0];
    expect(trigger.command).toBe("gone");
    expect(trigger.mappings[0].conditions).toEqual({
      mode: { argumentMin: 1 },
    });
  });
});

describe("migrateV3toV4 - preservation and validity", () => {
  test("preserves unrelated fields and produces state valid against the V4 schema", () => {
    const editor = createV3Editor({
      parameters: { "param-entity": localParam("intensity", "pc-1") },
    });
    const result = migrateV3toV4(createV3State(editor));

    expect(result.appSettings.locale).toBe("en-US");
    expect(
      result.deviceClassEditors["editor-1" as V4.EntityId].deviceClassId,
    ).toBe("test-device-class");

    const parsed = V4.AppStateSchema.safeParse(result);
    expect(
      parsed.success,
      parsed.success ? "" : JSON.stringify(treeifyError(parsed.error)),
    ).toBe(true);
  });
});

describe("migrateV3toV4 - ClassReference", () => {
  test("drops the denormalized codexId from a local parameter class ref", () => {
    const editor = createV3Editor({
      parameters: { "param-entity": localParam("intensity", "pc-1") },
    });
    const migrated = migratedEditor(editor);
    expect(migrated.parameters["param-entity" as V4.EntityId].class).toEqual({
      type: "local",
      id: "pc-1",
    });
  });

  test("leaves an imported class ref (with its library codexId) intact", () => {
    const editor = createV3Editor({
      parameters: {
        "param-entity": {
          codexId: "intensity" as V3.CodexId,
          class: {
            type: "imported",
            library: "lib",
            codexId: "colorMode" as V3.CodexId,
          },
          access: ["readActual"],
          lifetime: "runtime",
          localized: {},
        },
      },
    });
    const migrated = migratedEditor(editor);
    expect(migrated.parameters["param-entity" as V4.EntityId].class).toEqual({
      type: "imported",
      library: "lib",
      codexId: "colorMode",
    });
  });

  test("drops the codexId from a local command class ref", () => {
    const editor = createV3Editor({
      commands: {
        "cmd-entity": {
          codexId: "reset" as V3.CodexId,
          class: {
            type: "local",
            codexId: "cc" as V3.CodexId,
            id: "cc-1" as V3.EntityId,
          },
          access: ["read"],
          lifetime: "static",
        },
      },
    });
    const migrated = migratedEditor(editor);
    expect(migrated.commands["cmd-entity" as V4.EntityId].class).toEqual({
      type: "local",
      id: "cc-1",
    });
  });

  test("drops the codexId from a local resource class ref", () => {
    const editor = createV3Editor({
      resources: {
        "res-entity": {
          codexId: "logo" as V3.CodexId,
          class: {
            type: "local",
            codexId: "rc" as V3.CodexId,
            id: "rc-1" as V3.EntityId,
          },
          access: ["read"],
          lifetime: "static",
        },
      },
    });
    const migrated = migratedEditor(editor);
    expect(migrated.resources["res-entity" as V4.EntityId].class).toEqual({
      type: "local",
      id: "rc-1",
    });
  });
});

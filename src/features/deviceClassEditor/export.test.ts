import { describe, test, expect } from "vitest";
import { exportDeviceClass } from "./export";
import {
  CodexId,
  DeviceClassEditorState,
  EntityId,
  LocalizationKey,
  LocalizationDbSchema,
  ParameterClass,
  StructureClass,
  SerializerClass,
  ResourceClass,
  CommandClass,
  EnumChoice,
  EnumChoiceParent,
  CommandArgument,
  CommandReturnValue,
  Parameter,
  Resource,
  Command,
  DmxSerializerState,
} from "app/persistentState";

// ============================================================================
// Test Helpers
// ============================================================================

function createMinimalEditor(): DeviceClassEditorState {
  return {
    orgId: { type: "org", id: "test-org" },
    deviceClassId: "test-device-class",
    deviceClassVersion: "1.0.0",
    basicData: {
      publishDate: "2024-01-01T00:00:00.000Z",
      author: "Test Author",
      history: {},
      manufacturerName: "Test Manufacturer",
      manufacturerUrl: "https://example.com",
      manufacturerEstaId: "1234",
      modelName: "Test Model",
      modelCategory: "lighting",
      modelSubcategory: "fixed-profile",
      compatibleFirmwareVersions: ["1.0.0", "2.0.0"],
      localized: {
        description: LocalizationKey("test.description"),
      },
    },
    libraries: {
      "org.example.lib": "1.0.0",
    },
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
    windowLayout: "",
  };
}

// Entity factory functions - add entities to editor and return their EntityId

type ParamClassOpts = Partial<Omit<ParameterClass, "codexId" | "localized">> & {
  name?: string;
  description?: string;
};

function addParamClass(
  editor: DeviceClassEditorState,
  id: string,
  codexId: string,
  opts: ParamClassOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { name, description, ...rest } = opts;
  editor.parameterClasses[entityId] = {
    codexId: CodexId(codexId),
    dataType: rest.dataType ?? "number",
    ...rest,
    localized: {
      name: LocalizationKey(name ?? `${codexId}.name`),
      ...(description && { description: LocalizationKey(description) }),
    },
  };
  return entityId;
}

type StructClassOpts = Partial<
  Omit<StructureClass, "codexId" | "localized">
> & {
  name?: string;
  description?: string;
};

function addStructClass(
  editor: DeviceClassEditorState,
  id: string,
  codexId: string,
  opts: StructClassOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { name, description, ...rest } = opts;
  editor.structureClasses[entityId] = {
    codexId: CodexId(codexId),
    multipleAllowed: rest.multipleAllowed ?? true,
    ...rest,
    localized: {
      name: LocalizationKey(name ?? `${codexId}.name`),
      ...(description && { description: LocalizationKey(description) }),
    },
  };
  return entityId;
}

type SerClassOpts = Partial<Omit<SerializerClass, "codexId" | "localized">> & {
  name?: string;
  description?: string;
};

function addSerClass(
  editor: DeviceClassEditorState,
  id: string,
  codexId: string,
  opts: SerClassOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { name, description } = opts;
  editor.serializerClasses[entityId] = {
    codexId: CodexId(codexId),
    localized: {
      name: LocalizationKey(name ?? `${codexId}.name`),
      ...(description && { description: LocalizationKey(description) }),
    },
  };
  return entityId;
}

type ResClassOpts = Partial<Omit<ResourceClass, "codexId" | "localized">> & {
  name?: string;
  description?: string;
};

function addResClass(
  editor: DeviceClassEditorState,
  id: string,
  codexId: string,
  opts: ResClassOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { name, description, ...rest } = opts;
  editor.resourceClasses[entityId] = {
    codexId: CodexId(codexId),
    mediaType: rest.mediaType ?? ["image/png"],
    ...rest,
    localized: {
      name: LocalizationKey(name ?? `${codexId}.name`),
      ...(description && { description: LocalizationKey(description) }),
    },
  };
  return entityId;
}

type CmdClassOpts = Partial<Omit<CommandClass, "codexId" | "localized">> & {
  name?: string;
  description?: string;
};

function addCmdClass(
  editor: DeviceClassEditorState,
  id: string,
  codexId: string,
  opts: CmdClassOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { name, description } = opts;
  editor.commandClasses[entityId] = {
    codexId: CodexId(codexId),
    localized: {
      name: LocalizationKey(name ?? `${codexId}.name`),
      ...(description && { description: LocalizationKey(description) }),
    },
  };
  return entityId;
}

type EnumChoiceOpts = Partial<Omit<EnumChoice, "parent" | "codexId">> & {
  name?: string;
};

function addEnumChoice(
  editor: DeviceClassEditorState,
  id: string,
  parent: EnumChoiceParent,
  codexId: string,
  index: number,
  opts: EnumChoiceOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { name } = opts;
  editor.enumChoices[entityId] = {
    parent,
    codexId: CodexId(codexId),
    index,
    localized: {
      name: LocalizationKey(name ?? `${codexId}.name`),
    },
  };
  return entityId;
}

type CmdArgOpts = Partial<
  Omit<CommandArgument, "parentId" | "codexId" | "localized">
> & {
  name?: string;
  description?: string;
};

function addCmdArg(
  editor: DeviceClassEditorState,
  id: string,
  parentId: EntityId,
  codexId: string,
  opts: CmdArgOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { name, description, ...rest } = opts;
  editor.commandClassArguments[entityId] = {
    parentId,
    codexId: CodexId(codexId),
    dataType: rest.dataType ?? "number",
    required: rest.required ?? true,
    ...rest,
    localized: {
      name: LocalizationKey(name ?? `${codexId}.name`),
      ...(description && { description: LocalizationKey(description) }),
    },
  };
  return entityId;
}

type CmdRetOpts = Partial<
  Omit<CommandReturnValue, "parentId" | "codexId" | "localized">
> & {
  name?: string;
  description?: string;
};

function addCmdRet(
  editor: DeviceClassEditorState,
  id: string,
  parentId: EntityId,
  codexId: string,
  opts: CmdRetOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { name, description, ...rest } = opts;
  editor.commandClassReturnValues[entityId] = {
    parentId,
    codexId: CodexId(codexId),
    dataType: rest.dataType ?? "string",
    required: rest.required ?? false,
    ...rest,
    localized: {
      name: LocalizationKey(name ?? `${codexId}.name`),
      ...(description && { description: LocalizationKey(description) }),
    },
  };
  return entityId;
}

type ParamOpts = Partial<Omit<Parameter, "codexId" | "class">> & {
  friendlyName?: string;
};

function addParam(
  editor: DeviceClassEditorState,
  id: string,
  codexId: string,
  classRef: Parameter["class"],
  opts: ParamOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { friendlyName, localized: _, ...rest } = opts;
  editor.parameters[entityId] = {
    codexId: CodexId(codexId),
    class: classRef,
    access: rest.access ?? ["readActual"],
    lifetime: rest.lifetime ?? "static",
    ...rest,
    localized: {
      ...(friendlyName && { friendlyName: LocalizationKey(friendlyName) }),
    },
  };
  return entityId;
}

type ResOpts = Partial<Omit<Resource, "codexId" | "class">>;

function addRes(
  editor: DeviceClassEditorState,
  id: string,
  codexId: string,
  classRef: Resource["class"],
  opts: ResOpts = {},
): EntityId {
  const entityId = EntityId(id);
  editor.resources[entityId] = {
    codexId: CodexId(codexId),
    class: classRef,
    access: opts.access ?? ["read"],
    lifetime: opts.lifetime ?? "static",
    ...opts,
  };
  return entityId;
}

type CmdOpts = Partial<Omit<Command, "codexId" | "class">> & {
  friendlyName?: string;
};

function addCmd(
  editor: DeviceClassEditorState,
  id: string,
  codexId: string,
  classRef: Command["class"],
  opts: CmdOpts = {},
): EntityId {
  const entityId = EntityId(id);
  const { friendlyName, localized: _, ...rest } = opts;
  editor.commands[entityId] = {
    codexId: CodexId(codexId),
    class: classRef,
    completionNotification: rest.completionNotification ?? false,
    ...rest,
    localized: {
      ...(friendlyName && { friendlyName: LocalizationKey(friendlyName) }),
    },
  };
  return entityId;
}

// Helper to create a local class reference
function localClass(codexId: string, id: EntityId) {
  return { type: "local" as const, codexId: CodexId(codexId), id };
}

// Helper to create an imported class reference
function importedClass(library: string, codexId: string) {
  return { type: "imported" as const, library, codexId: CodexId(codexId) };
}

// DMX Serializer helpers
type DmxMappingOpts = {
  mappedParam: { codexId: string; index?: number };
  ranges?: Array<{
    chunkStart: number;
    chunkEnd: number;
    start: number;
    end: number;
  }>;
  unmappedParams?: Array<{
    parameter: { codexId: string; index?: number };
    start: number;
    end: number;
  }>;
};

function rangeToChunkValues(range: {
  chunkStart: number;
  chunkEnd: number;
  start: number;
  end: number;
}) {
  return {
    start: range.start,
    end: range.end,
    chunkValues: {
      type: "range" as const,
      chunkStart: range.chunkStart,
      chunkEnd: range.chunkEnd,
    },
  };
}

function createDmxState(): NonNullable<
  DeviceClassEditorState["dmxSerializer"]
> {
  return {
    chunks: {},
    mappingGroups: {},
    conditions: {},
  };
}

function addDmxChunk(
  dmx: DmxSerializerState,
  id: string,
  offsets: number[],
): EntityId {
  const entityId = EntityId(id);
  dmx.chunks[entityId] = { offsets };
  return entityId;
}

function addDmxMappingGroup(
  dmx: DmxSerializerState,
  id: string,
  chunkId: EntityId,
  index: number,
  mappings: DmxMappingOpts[] = [],
): EntityId {
  const entityId = EntityId(id);
  dmx.mappingGroups[entityId] = {
    chunkId,
    index,
    mappings: mappings.map((m) => ({
      mappedParam: {
        codexId: CodexId(m.mappedParam.codexId),
        index: m.mappedParam.index,
      },
      ranges: (m.ranges ?? []).map(rangeToChunkValues),
      unmappedParams: m.unmappedParams?.map((u) => ({
        parameter: {
          codexId: CodexId(u.parameter.codexId),
          index: u.parameter.index,
        },
        start: u.start,
        end: u.end,
      })),
    })),
    triggers: [],
  };
  return entityId;
}

function addDmxChunkRefCondition(
  dmx: DmxSerializerState,
  id: string,
  parent: { type: "mappingGroup" | "condition"; id: EntityId },
  chunkId: EntityId,
  chunkStart: number,
  chunkEnd: number,
): EntityId {
  const entityId = EntityId(id);
  dmx.conditions[entityId] = {
    conditionType: "chunkRef",
    parent,
    chunkId,
    chunkStart,
    chunkEnd,
  };
  return entityId;
}

function addDmxGroupCondition(
  dmx: DmxSerializerState,
  id: string,
  parent: { type: "mappingGroup" | "condition"; id: EntityId },
  match: "any" | "all",
): EntityId {
  const entityId = EntityId(id);
  dmx.conditions[entityId] = {
    conditionType: "group",
    parent,
    match,
  };
  return entityId;
}

describe("exportDeviceClass", () => {
  test("exports basic device class metadata", () => {
    const editor = createMinimalEditor();
    const result = exportDeviceClass(editor);

    expect(result["@description"]).toBe("test.description");
    expect(result.publishDate).toBe("2024-01-01T00:00:00.000Z");
    expect(result.author).toBe("Test Author");
    expect(result.info.manufacturer.name).toBe("Test Manufacturer");
    expect(result.info.manufacturer.url).toBe("https://example.com");
    expect(result.info.manufacturer.estaId).toBe("1234");
    expect(result.info.model.name).toBe("Test Model");
    expect(result.info.model.category).toBe("lighting");
    expect(result.info.model.subcategory).toBe("fixed-profile");
    expect(result.info.compatibility?.firmwareVersions).toEqual([
      "1.0.0",
      "2.0.0",
    ]);
    expect(result.libraries).toEqual({ "org.example.lib": "1.0.0" });
  });

  test("exports empty device library when no classes defined", () => {
    const editor = createMinimalEditor();
    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary).toBeUndefined();
  });
});

describe("exportLocalizations", () => {
  test("exports localizations correctly", () => {
    const editor = createMinimalEditor();
    editor.localizations = {
      [LocalizationKey("test.key1")]: {
        strings: LocalizationDbSchema.parse({
          en: "English text",
          fr: "French text",
        }),
        items: [],
      },
      [LocalizationKey("test.key2")]: {
        strings: LocalizationDbSchema.parse({
          en: "Another English text",
        }),
        items: [],
      },
    };

    const result = exportDeviceClass(editor);

    expect(result.localizations).toEqual({
      en: {
        strings: {
          "test.key1": "English text",
          "test.key2": "Another English text",
        },
      },
      fr: {
        strings: {
          "test.key1": "French text",
        },
      },
    });
  });

  test("handles empty localizations", () => {
    const editor = createMinimalEditor();
    const result = exportDeviceClass(editor);

    expect(result.localizations).toBeUndefined();
  });
});

describe("exportParameterClasses", () => {
  test("exports parameter class without choices", () => {
    const editor = createMinimalEditor();
    addParamClass(editor, "pc-1", "test.param.class", {
      unit: { name: "ratio", exponent: 0 },
      name: "param.class.name",
      description: "param.class.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.parameterClasses).toEqual({
      "test.param.class": {
        "@name": "param.class.name",
        "@description": "param.class.desc",
        dataType: "number",
        unit: { name: "ratio", exponent: 0 },
      },
    });
  });

  test("exports parameter class with enum choices", () => {
    const editor = createMinimalEditor();
    const paramClassId = addParamClass(editor, "pc-1", "test.enum.param", {
      dataType: "enum",
      name: "enum.param.name",
      description: "enum.param.desc",
    });

    addEnumChoice(
      editor,
      "c-1",
      { type: "paramClass", id: paramClassId },
      "choice1",
      0,
    );
    addEnumChoice(
      editor,
      "c-2",
      { type: "paramClass", id: paramClassId },
      "choice2",
      1,
    );

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.parameterClasses?.["test.enum.param"]).toEqual(
      {
        "@name": "enum.param.name",
        "@description": "enum.param.desc",
        dataType: "enum",
        choices: [
          { id: "choice1", "@name": "choice1.name" },
          { id: "choice2", "@name": "choice2.name" },
        ],
      },
    );
  });

  test("throws error for duplicate parameter class IDs", () => {
    const editor = createMinimalEditor();
    addParamClass(editor, "p-1", "duplicate", { name: "name1" });
    addParamClass(editor, "p-2", "duplicate", { name: "name2" });

    expect(() => exportDeviceClass(editor)).toThrow(
      "Duplicate parameter class ID",
    );
  });
});

describe("exportStructureClasses", () => {
  test("exports structure class correctly", () => {
    const editor = createMinimalEditor();
    addStructClass(editor, "s-1", "test.struct", {
      name: "struct.name",
      description: "struct.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.structureClasses).toEqual({
      "test.struct": {
        "@name": "struct.name",
        "@description": "struct.desc",
        multipleAllowed: true,
      },
    });
  });

  test("exports multiple structure classes", () => {
    const editor = createMinimalEditor();
    addStructClass(editor, "s-1", "struct.one", {
      multipleAllowed: false,
      name: "struct1.name",
      description: "struct1.desc",
    });
    addStructClass(editor, "s-2", "struct.two", {
      name: "struct2.name",
      description: "struct2.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.structureClasses).toEqual({
      "struct.one": {
        "@name": "struct1.name",
        "@description": "struct1.desc",
        multipleAllowed: false,
      },
      "struct.two": {
        "@name": "struct2.name",
        "@description": "struct2.desc",
        multipleAllowed: true,
      },
    });
  });

  test("throws error for duplicate structure class IDs", () => {
    const editor = createMinimalEditor();
    addStructClass(editor, "s-1", "duplicate", { name: "name1" });
    addStructClass(editor, "s-2", "duplicate", { name: "name2" });

    expect(() => exportDeviceClass(editor)).toThrow(
      "Duplicate structure class ID",
    );
  });
});

describe("exportSerializerClasses", () => {
  test("exports serializer class correctly", () => {
    const editor = createMinimalEditor();
    addSerClass(editor, "ser-1", "test.serializer", {
      name: "ser.name",
      description: "ser.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.serializerClasses).toEqual({
      "test.serializer": {
        "@name": "ser.name",
        "@description": "ser.desc",
      },
    });
  });

  test("exports multiple serializer classes", () => {
    const editor = createMinimalEditor();
    addSerClass(editor, "ser-1", "ser.one", {
      name: "ser1.name",
      description: "ser1.desc",
    });
    addSerClass(editor, "ser-2", "ser.two", {
      name: "ser2.name",
      description: "ser2.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.serializerClasses).toEqual({
      "ser.one": { "@name": "ser1.name", "@description": "ser1.desc" },
      "ser.two": { "@name": "ser2.name", "@description": "ser2.desc" },
    });
  });

  test("throws error for duplicate serializer class IDs", () => {
    const editor = createMinimalEditor();
    addSerClass(editor, "ser-1", "duplicate", { name: "name1" });
    addSerClass(editor, "ser-2", "duplicate", { name: "name2" });

    expect(() => exportDeviceClass(editor)).toThrow(
      "Duplicate serializer class ID",
    );
  });
});

describe("exportResourceClasses", () => {
  test("exports resource class correctly", () => {
    const editor = createMinimalEditor();
    addResClass(editor, "r-1", "test.resource", {
      name: "res.name",
      description: "res.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.resourceClasses).toEqual({
      "test.resource": {
        "@name": "res.name",
        "@description": "res.desc",
        mediaType: ["image/png"],
      },
    });
  });

  test("exports multiple resource classes with different media types", () => {
    const editor = createMinimalEditor();
    addResClass(editor, "r-1", "res.image", {
      mediaType: ["image/jpeg"],
      name: "res.image.name",
      description: "res.image.desc",
    });
    addResClass(editor, "r-2", "res.video", {
      mediaType: ["video/mp4"],
      name: "res.video.name",
      description: "res.video.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.resourceClasses).toEqual({
      "res.image": {
        "@name": "res.image.name",
        "@description": "res.image.desc",
        mediaType: ["image/jpeg"],
      },
      "res.video": {
        "@name": "res.video.name",
        "@description": "res.video.desc",
        mediaType: ["video/mp4"],
      },
    });
  });

  test("throws error for duplicate resource class IDs", () => {
    const editor = createMinimalEditor();
    addResClass(editor, "r-1", "duplicate", { name: "name1" });
    addResClass(editor, "r-2", "duplicate", {
      name: "name2",
      mediaType: ["image/jpeg"],
    });

    expect(() => exportDeviceClass(editor)).toThrow(
      "Duplicate resource class ID",
    );
  });
});

describe("exportCommandClasses", () => {
  test("exports simple command class without arguments or returns", () => {
    const editor = createMinimalEditor();
    addCmdClass(editor, "cmd-1", "test.command", {
      name: "cmd.name",
      description: "cmd.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.commandClasses).toEqual({
      "test.command": { "@name": "cmd.name", "@description": "cmd.desc" },
    });
  });

  test("exports command class with arguments", () => {
    const editor = createMinimalEditor();
    const cmdClassId = addCmdClass(editor, "cmd-1", "test.cmd", {
      name: "cmd.name",
      description: "cmd.desc",
    });
    addCmdArg(editor, "arg-1", cmdClassId, "arg1", {
      unit: { name: "ratio", exponent: 0 },
      name: "arg1.name",
      description: "arg1.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.commandClasses?.["test.cmd"]).toEqual({
      "@name": "cmd.name",
      "@description": "cmd.desc",
      arguments: {
        arg1: {
          "@name": "arg1.name",
          "@description": "arg1.desc",
          dataType: "number",
          unit: { name: "ratio", exponent: 0 },
          required: true,
        },
      },
    });
  });

  test("exports command class with return values", () => {
    const editor = createMinimalEditor();
    const cmdClassId = addCmdClass(editor, "cmd-1", "test.cmd", {
      name: "cmd.name",
      description: "cmd.desc",
    });
    addCmdRet(editor, "ret-1", cmdClassId, "ret1", {
      name: "ret1.name",
      description: "ret1.desc",
    });

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.commandClasses?.["test.cmd"]).toEqual({
      "@name": "cmd.name",
      "@description": "cmd.desc",
      returns: {
        ret1: {
          "@name": "ret1.name",
          "@description": "ret1.desc",
          dataType: "string",
          required: false,
        },
      },
    });
  });

  test("exports command class with enum argument and choices", () => {
    const editor = createMinimalEditor();
    const cmdClassId = addCmdClass(editor, "cmd-1", "test.cmd", {
      name: "cmd.name",
      description: "cmd.desc",
    });
    const argId = addCmdArg(editor, "arg-1", cmdClassId, "arg1", {
      dataType: "enum",
      name: "arg1.name",
      description: "arg1.desc",
    });
    addEnumChoice(
      editor,
      "c-1",
      { type: "cmdClassArg", id: argId },
      "choice1",
      1,
    );
    addEnumChoice(
      editor,
      "c-2",
      { type: "cmdClassArg", id: argId },
      "choice2",
      0,
    );

    const result = exportDeviceClass(editor);

    expect(
      result.deviceLibrary?.commandClasses?.["test.cmd"]?.arguments?.arg1
        ?.choices,
    ).toEqual([
      { id: "choice2", "@name": "choice2.name" },
      { id: "choice1", "@name": "choice1.name" },
    ]);
  });

  test("exports command class with enum return value and choices", () => {
    const editor = createMinimalEditor();
    const cmdClassId = addCmdClass(editor, "cmd-1", "test.cmd");
    const retId = addCmdRet(editor, "ret-1", cmdClassId, "ret1", {
      dataType: "enum",
      required: true,
    });
    addEnumChoice(
      editor,
      "c-1",
      { type: "cmdClassRet", id: retId },
      "status.ok",
      0,
    );
    addEnumChoice(
      editor,
      "c-2",
      { type: "cmdClassRet", id: retId },
      "status.error",
      1,
    );

    const result = exportDeviceClass(editor);

    expect(
      result.deviceLibrary?.commandClasses?.["test.cmd"]?.returns?.ret1
        ?.choices,
    ).toEqual([
      { id: "status.ok", "@name": "status.ok.name" },
      { id: "status.error", "@name": "status.error.name" },
    ]);
  });

  test("throws error for duplicate command class IDs", () => {
    const editor = createMinimalEditor();
    addCmdClass(editor, "cmd-1", "duplicate", { name: "name1" });
    addCmdClass(editor, "cmd-2", "duplicate", { name: "name2" });

    expect(() => exportDeviceClass(editor)).toThrow(
      "Duplicate command class ID",
    );
  });

  test("throws error for duplicate argument codex IDs in same command class", () => {
    const editor = createMinimalEditor();
    const cmdClassId = addCmdClass(editor, "cmd-1", "test.cmd");
    addCmdArg(editor, "arg-1", cmdClassId, "duplicate-arg", {
      name: "arg1.name",
    });
    addCmdArg(editor, "arg-2", cmdClassId, "duplicate-arg", {
      name: "arg2.name",
      required: false,
    });

    expect(() => exportDeviceClass(editor)).toThrow(
      "Duplicate argument codex ID",
    );
  });

  test("exports complex command class with multiple arguments and returns", () => {
    const editor = createMinimalEditor();
    const cmdClassId = addCmdClass(editor, "cmd-1", "complex.cmd", {
      name: "complex.name",
      description: "complex.desc",
    });
    addCmdArg(editor, "arg-1", cmdClassId, "arg1");
    addCmdArg(editor, "arg-2", cmdClassId, "arg2", {
      dataType: "string",
      required: false,
    });
    addCmdRet(editor, "ret-1", cmdClassId, "ret1", {
      dataType: "boolean",
      required: true,
    });
    addCmdRet(editor, "ret-2", cmdClassId, "ret2", { dataType: "number" });

    const result = exportDeviceClass(editor);

    const exported = result.deviceLibrary?.commandClasses?.["complex.cmd"];
    expect(exported).toBeDefined();
    expect(Object.keys(exported!.arguments ?? {})).toHaveLength(2);
    expect(Object.keys(exported!.returns ?? {})).toHaveLength(2);
    expect(exported!.arguments?.arg1.dataType).toBe("number");
    expect(exported!.arguments?.arg2.dataType).toBe("string");
    expect(exported!.returns?.ret1.dataType).toBe("boolean");
    expect(exported!.returns?.ret2.dataType).toBe("number");
  });
});

describe("exportParameters", () => {
  test("exports parameter with local class reference", () => {
    const editor = createMinimalEditor();
    const pcId = addParamClass(editor, "pc-1", "test.param.class");
    addParam(
      editor,
      "p-1",
      "brightness",
      localClass("test.param.class", pcId),
      {
        access: ["readActual", "write"],
      },
    );

    const result = exportDeviceClass(editor);

    expect(result.parameters).toEqual({
      brightness: {
        class: "test.param.class",
        access: ["readActual", "write"],
        lifetime: "static",
      },
    });
  });

  test("exports parameter with imported class reference", () => {
    const editor = createMinimalEditor();
    addParam(
      editor,
      "p-1",
      "intensity",
      importedClass("org.example.lib", "example.intensity"),
      {
        access: ["readTarget", "write"],
        lifetime: "runtime",
      },
    );

    const result = exportDeviceClass(editor);

    expect(result.parameters).toEqual({
      intensity: {
        class: "example.intensity",
        library: "org.example.lib",
        access: ["readTarget", "write"],
        lifetime: "runtime",
      },
    });
  });

  test("exports parameter with all optional fields", () => {
    const editor = createMinimalEditor();
    const pcId = addParamClass(editor, "pc-1", "test.param");
    addParam(editor, "p-1", "value", localClass("test.param", pcId), {
      count: { type: "fixed", value: 10 },
      atomicIdentifier: "atomicId",
      minimum: 0,
      maximum: 100,
      minimumModifier: "minMod",
      maximumModifier: "maxMod",
      default: 50,
      wrapping: true,
      friendlyName: "value.friendly",
    });

    const result = exportDeviceClass(editor);

    expect(result.parameters?.value).toEqual({
      class: "test.param",
      access: ["readActual"],
      lifetime: "static",
      "@friendlyName": "value.friendly",
      count: { type: "fixed", value: 10 },
      atomicIdentifier: "atomicId",
      minimum: 0,
      maximum: 100,
      minimumModifier: "minMod",
      maximumModifier: "maxMod",
      default: 50,
      looping: true,
    });
  });

  test("exports parameter with enum exclusions", () => {
    const editor = createMinimalEditor();
    const pcId = addParamClass(editor, "pc-1", "test.enum", {
      dataType: "enum",
    });
    addParam(editor, "p-1", "mode", localClass("test.enum", pcId), {
      access: ["readActual", "write"],
      enumExclusions: [CodexId("excluded1"), CodexId("excluded2")],
    });

    const result = exportDeviceClass(editor);

    expect(result.parameters?.mode).toEqual({
      class: "test.enum",
      access: ["readActual", "write"],
      lifetime: "static",
      choices: { excluded: ["excluded1", "excluded2"] },
    });
  });

  test("exports parameter with additional enum choices", () => {
    const editor = createMinimalEditor();
    const pcId = addParamClass(editor, "pc-1", "test.enum", {
      dataType: "enum",
    });
    const paramId = addParam(
      editor,
      "p-1",
      "mode",
      localClass("test.enum", pcId),
      {
        access: ["readActual", "write"],
      },
    );
    addEnumChoice(
      editor,
      "c-1",
      { type: "paramAdditional", id: paramId },
      "custom1",
      0,
    );
    addEnumChoice(
      editor,
      "c-2",
      { type: "paramAdditional", id: paramId },
      "custom2",
      1,
    );

    const result = exportDeviceClass(editor);

    expect(result.parameters?.mode.choices).toEqual({
      additional: [
        { id: "custom1", "@name": "custom1.name" },
        { id: "custom2", "@name": "custom2.name" },
      ],
    });
  });

  test("exports parameter with both exclusions and additional choices", () => {
    const editor = createMinimalEditor();
    const pcId = addParamClass(editor, "pc-1", "test.enum", {
      dataType: "enum",
    });
    const paramId = addParam(
      editor,
      "p-1",
      "mode",
      localClass("test.enum", pcId),
      {
        access: ["readActual", "write"],
        enumExclusions: [CodexId("excluded1")],
      },
    );
    addEnumChoice(
      editor,
      "c-1",
      { type: "paramAdditional", id: paramId },
      "custom1",
      0,
    );

    const result = exportDeviceClass(editor);

    expect(result.parameters?.mode.choices).toEqual({
      excluded: ["excluded1"],
      additional: [{ id: "custom1", "@name": "custom1.name" }],
    });
  });

  test("throws error for duplicate parameter IDs", () => {
    const editor = createMinimalEditor();
    const pcId = addParamClass(editor, "pc-1", "test.param");
    addParam(editor, "p-1", "duplicate", localClass("test.param", pcId));
    addParam(editor, "p-2", "duplicate", localClass("test.param", pcId), {
      access: ["write"],
    });

    expect(() => exportDeviceClass(editor)).toThrow("Duplicate parameter ID");
  });
});

describe("exportResources", () => {
  test("exports resource with local class reference", () => {
    const editor = createMinimalEditor();
    const rcId = addResClass(editor, "rc-1", "test.resource");
    addRes(editor, "r-1", "logo", localClass("test.resource", rcId));

    const result = exportDeviceClass(editor);

    expect(result.resources).toEqual({
      logo: { class: "test.resource", access: ["read"], lifetime: "static" },
    });
  });

  test("exports resource with imported class reference", () => {
    const editor = createMinimalEditor();
    addRes(
      editor,
      "r-1",
      "icon",
      importedClass("org.example.lib", "example.icon"),
      {
        access: ["read", "write"],
        lifetime: "runtime",
      },
    );

    const result = exportDeviceClass(editor);

    expect(result.resources).toEqual({
      icon: {
        class: "example.icon",
        library: "org.example.lib",
        access: ["read", "write"],
        lifetime: "runtime",
      },
    });
  });

  test("exports resource with all optional fields", () => {
    const editor = createMinimalEditor();
    const rcId = addResClass(editor, "rc-1", "test.resource");
    addRes(editor, "r-1", "image", localClass("test.resource", rcId), {
      mediaType: "image/jpeg",
      assetId: "asset-123",
      importPath: "/path/to/image.jpg",
      provenance: "manufacturer",
      default: "default-image-data",
    });

    const result = exportDeviceClass(editor);

    expect(result.resources?.image).toEqual({
      class: "test.resource",
      access: ["read"],
      lifetime: "static",
      mediaType: "image/jpeg",
      assetId: "asset-123",
      importPath: "/path/to/image.jpg",
      provenance: "manufacturer",
      default: "default-image-data",
    });
  });

  test("throws error for duplicate resource IDs", () => {
    const editor = createMinimalEditor();
    const rcId = addResClass(editor, "rc-1", "test.resource");
    addRes(editor, "r-1", "duplicate", localClass("test.resource", rcId));
    addRes(editor, "r-2", "duplicate", localClass("test.resource", rcId), {
      access: ["write"],
    });

    expect(() => exportDeviceClass(editor)).toThrow("Duplicate resource ID");
  });
});

describe("exportCommands", () => {
  test("exports command with local class reference", () => {
    const editor = createMinimalEditor();
    const ccId = addCmdClass(editor, "cc-1", "test.command");
    addCmd(editor, "cmd-1", "reset", localClass("test.command", ccId));

    const result = exportDeviceClass(editor);

    expect(result.commands).toEqual({
      reset: { class: "test.command", completionNotification: false },
    });
  });

  test("exports command with imported class reference", () => {
    const editor = createMinimalEditor();
    addCmd(
      editor,
      "cmd-1",
      "calibrate",
      importedClass("org.example.lib", "example.calibrate"),
      {
        completionNotification: true,
      },
    );

    const result = exportDeviceClass(editor);

    expect(result.commands).toEqual({
      calibrate: {
        class: "example.calibrate",
        library: "org.example.lib",
        completionNotification: true,
      },
    });
  });

  test("exports command with friendly name", () => {
    const editor = createMinimalEditor();
    const ccId = addCmdClass(editor, "cc-1", "test.command");
    addCmd(editor, "cmd-1", "reset", localClass("test.command", ccId), {
      friendlyName: "reset.friendly",
    });

    const result = exportDeviceClass(editor);

    expect(result.commands?.reset).toEqual({
      class: "test.command",
      completionNotification: false,
      "@friendlyName": "reset.friendly",
    });
  });

  test("exports command with argument exclusions", () => {
    const editor = createMinimalEditor();
    const ccId = addCmdClass(editor, "cc-1", "test.command");
    addCmd(editor, "cmd-1", "configure", localClass("test.command", ccId), {
      argEnumExclusions: {
        [CodexId("arg1")]: [CodexId("excluded1"), CodexId("excluded2")],
      },
    });

    const result = exportDeviceClass(editor);

    expect(result.commands?.configure.argumentChoices).toEqual({
      arg1: { excluded: ["excluded1", "excluded2"] },
    });
  });

  test("exports command with additional argument choices", () => {
    const editor = createMinimalEditor();
    const ccId = addCmdClass(editor, "cc-1", "test.command");
    const argId = addCmdArg(editor, "arg-1", ccId, "mode", {
      dataType: "enum",
    });
    const cmdId = addCmd(
      editor,
      "cmd-1",
      "configure",
      localClass("test.command", ccId),
    );

    addEnumChoice(
      editor,
      "c-1",
      { type: "cmdArg", idType: "local", id: argId, cmdId },
      "custom1",
      0,
    );
    addEnumChoice(
      editor,
      "c-2",
      { type: "cmdArg", idType: "local", id: argId, cmdId },
      "custom2",
      1,
    );

    const result = exportDeviceClass(editor);

    expect(result.commands?.configure.argumentChoices).toEqual({
      mode: {
        additional: [
          { id: "custom1", "@name": "custom1.name" },
          { id: "custom2", "@name": "custom2.name" },
        ],
      },
    });
  });

  test("exports command with return exclusions", () => {
    const editor = createMinimalEditor();
    const ccId = addCmdClass(editor, "cc-1", "test.command");
    addCmd(editor, "cmd-1", "query", localClass("test.command", ccId), {
      returnEnumExclusions: {
        [CodexId("status")]: [CodexId("unknown"), CodexId("pending")],
      },
    });

    const result = exportDeviceClass(editor);

    expect(result.commands?.query.returnChoices).toEqual({
      status: { excluded: ["unknown", "pending"] },
    });
  });

  test("exports command with additional return choices", () => {
    const editor = createMinimalEditor();
    const ccId = addCmdClass(editor, "cc-1", "test.command");
    const retId = addCmdRet(editor, "ret-1", ccId, "status", {
      dataType: "enum",
      required: true,
    });
    const cmdId = addCmd(
      editor,
      "cmd-1",
      "query",
      localClass("test.command", ccId),
    );

    addEnumChoice(
      editor,
      "c-1",
      { type: "cmdRet", idType: "local", id: retId, cmdId },
      "custom.ok",
      0,
    );
    addEnumChoice(
      editor,
      "c-2",
      { type: "cmdRet", idType: "local", id: retId, cmdId },
      "custom.error",
      1,
    );

    const result = exportDeviceClass(editor);

    expect(result.commands?.query.returnChoices).toEqual({
      status: {
        additional: [
          { id: "custom.ok", "@name": "custom.ok.name" },
          { id: "custom.error", "@name": "custom.error.name" },
        ],
      },
    });
  });

  test("throws error for duplicate command IDs", () => {
    const editor = createMinimalEditor();
    const ccId = addCmdClass(editor, "cc-1", "test.command");
    addCmd(editor, "cmd-1", "duplicate", localClass("test.command", ccId));
    addCmd(editor, "cmd-2", "duplicate", localClass("test.command", ccId), {
      completionNotification: true,
    });

    expect(() => exportDeviceClass(editor)).toThrow("Duplicate command ID");
  });
});

describe("exportDeviceClass integration", () => {
  test("exports complete device class with all types of classes", () => {
    const editor = createMinimalEditor();
    addParamClass(editor, "p1", "param1");
    addStructClass(editor, "s1", "struct1");
    addSerClass(editor, "ser1", "serializer1");
    addResClass(editor, "r1", "resource1");
    addCmdClass(editor, "c1", "command1");

    const result = exportDeviceClass(editor);

    expect(result.deviceLibrary?.parameterClasses).toBeDefined();
    expect(result.deviceLibrary?.structureClasses).toBeDefined();
    expect(result.deviceLibrary?.serializerClasses).toBeDefined();
    expect(result.deviceLibrary?.resourceClasses).toBeDefined();
    expect(result.deviceLibrary?.commandClasses).toBeDefined();

    expect(
      Object.keys(result.deviceLibrary?.parameterClasses ?? {}),
    ).toHaveLength(1);
    expect(
      Object.keys(result.deviceLibrary?.structureClasses ?? {}),
    ).toHaveLength(1);
    expect(
      Object.keys(result.deviceLibrary?.serializerClasses ?? {}),
    ).toHaveLength(1);
    expect(
      Object.keys(result.deviceLibrary?.resourceClasses ?? {}),
    ).toHaveLength(1);
    expect(
      Object.keys(result.deviceLibrary?.commandClasses ?? {}),
    ).toHaveLength(1);
  });
});

describe("exportDmxSerializer", () => {
  test("does not export DMX when dmxSerializer is undefined", () => {
    const editor = createMinimalEditor();
    const result = exportDeviceClass(editor);

    expect(result.serializers).toBeUndefined();
  });

  test("exports simple DMX serializer with one chunk and one mapping group", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunkId = addDmxChunk(dmx, "chunk-1", [0]);
    addDmxMappingGroup(dmx, "mg-1", chunkId, 0, [
      {
        mappedParam: { codexId: "intensity" },
        ranges: [{ chunkStart: 0, chunkEnd: 255, start: 0, end: 100 }],
      },
    ]);

    const result = exportDeviceClass(editor);

    expect(result.serializers?.dmx).toBeDefined();
    expect(result.serializers?.dmx?.type).toBe("EstaDmx");
    expect(result.serializers?.dmx?.value.access).toEqual(["read"]);
    expect(result.serializers?.dmx?.value.lifetime).toBe("static");

    const estaDmx = result.serializers!.dmx!.value.default!;
    expect(estaDmx.chunks["0"]).toBeDefined();
    expect(estaDmx.chunks["0"].offsets).toEqual([0]);
    expect(estaDmx.chunks["0"].mappingGroups).toHaveLength(1);
    expect(
      estaDmx.chunks["0"].mappingGroups[0].mappings[0].mappedParam,
    ).toEqual({ id: "intensity" });
    expect(estaDmx.chunks["0"].mappingGroups[0].conditions).toBeUndefined();
  });

  test("generates chunk ID based on offsets", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunk1Id = addDmxChunk(dmx, "chunk-1", [0, 1, 2]);
    const chunk2Id = addDmxChunk(dmx, "chunk-2", [5]);
    addDmxMappingGroup(dmx, "mg-1", chunk1Id, 0);
    addDmxMappingGroup(dmx, "mg-2", chunk2Id, 0);

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;

    expect(estaDmx.chunks["0-1-2"]).toBeDefined();
    expect(estaDmx.chunks["0-1-2"].offsets).toEqual([0, 1, 2]);
    expect(estaDmx.chunks["5"]).toBeDefined();
    expect(estaDmx.chunks["5"].offsets).toEqual([5]);
  });

  test("exports multiple mapping groups sorted by index", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunkId = addDmxChunk(dmx, "chunk-1", [0]);
    addDmxMappingGroup(dmx, "mg-1", chunkId, 2, [
      { mappedParam: { codexId: "param3" } },
    ]);
    addDmxMappingGroup(dmx, "mg-2", chunkId, 0, [
      { mappedParam: { codexId: "param1" } },
    ]);
    addDmxMappingGroup(dmx, "mg-3", chunkId, 1, [
      { mappedParam: { codexId: "param2" } },
    ]);

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;

    expect(estaDmx.chunks["0"].mappingGroups).toHaveLength(3);
    expect(
      estaDmx.chunks["0"].mappingGroups[0].mappings[0].mappedParam,
    ).toEqual({ id: "param1" });
    expect(
      estaDmx.chunks["0"].mappingGroups[1].mappings[0].mappedParam,
    ).toEqual({ id: "param2" });
    expect(
      estaDmx.chunks["0"].mappingGroups[2].mappings[0].mappedParam,
    ).toEqual({ id: "param3" });
  });

  test("exports parameter references with indices", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunkId = addDmxChunk(dmx, "chunk-1", [0]);
    addDmxMappingGroup(dmx, "mg-1", chunkId, 0, [
      {
        mappedParam: { codexId: "color", index: 2 },
        unmappedParams: [
          { parameter: { codexId: "brightness", index: 0 }, start: 0, end: 50 },
        ],
      },
    ]);

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;

    expect(
      estaDmx.chunks["0"].mappingGroups[0].mappings[0].mappedParam,
    ).toEqual({ id: "color", index: 2 });
    expect(
      estaDmx.chunks["0"].mappingGroups[0].mappings[0].unmappedParams?.[0]
        .parameter,
    ).toEqual({ id: "brightness", index: 0 });
  });

  test("exports chunk reference condition", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunk1Id = addDmxChunk(dmx, "chunk-1", [0]);
    const chunk2Id = addDmxChunk(dmx, "chunk-2", [1]);
    const mgId = addDmxMappingGroup(dmx, "mg-1", chunk1Id, 0);
    addDmxChunkRefCondition(
      dmx,
      "cond-1",
      { type: "mappingGroup", id: mgId },
      chunk2Id,
      10,
      20,
    );

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;

    expect(estaDmx.chunks["0"].mappingGroups[0].conditions).toHaveLength(1);
    expect(estaDmx.chunks["0"].mappingGroups[0].conditions?.[0]).toEqual({
      type: "simple",
      value: {
        chunk: "1",
        chunkStart: 10,
        chunkEnd: 20,
      },
    });
  });

  test("exports group condition with children", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunk1Id = addDmxChunk(dmx, "chunk-1", [0]);
    const chunk2Id = addDmxChunk(dmx, "chunk-2", [1]);
    const mgId = addDmxMappingGroup(dmx, "mg-1", chunk1Id, 0);
    const groupCondId = addDmxGroupCondition(
      dmx,
      "group-cond",
      { type: "mappingGroup", id: mgId },
      "any",
    );
    addDmxChunkRefCondition(
      dmx,
      "child-1",
      { type: "condition", id: groupCondId },
      chunk2Id,
      0,
      50,
    );
    addDmxChunkRefCondition(
      dmx,
      "child-2",
      { type: "condition", id: groupCondId },
      chunk2Id,
      100,
      200,
    );

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;

    expect(estaDmx.chunks["0"].mappingGroups[0].conditions).toHaveLength(1);
    const groupCond = estaDmx.chunks["0"].mappingGroups[0].conditions?.[0];
    expect(groupCond?.type).toBe("group");
    if (groupCond?.type === "group") {
      expect(groupCond.value.condMatch).toBe("any");
      expect(groupCond.value.conditions).toHaveLength(2);
      expect(groupCond.value.conditions[0]).toEqual({
        type: "simple",
        value: {
          chunk: "1",
          chunkStart: 0,
          chunkEnd: 50,
        },
      });
      expect(groupCond.value.conditions[1]).toEqual({
        type: "simple",
        value: {
          chunk: "1",
          chunkStart: 100,
          chunkEnd: 200,
        },
      });
    }
  });

  test("exports nested group conditions", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunk1Id = addDmxChunk(dmx, "chunk-1", [0]);
    const chunk2Id = addDmxChunk(dmx, "chunk-2", [1]);
    const mgId = addDmxMappingGroup(dmx, "mg-1", chunk1Id, 0);
    const topGroupId = addDmxGroupCondition(
      dmx,
      "top-group",
      { type: "mappingGroup", id: mgId },
      "all",
    );
    const nestedGroupId = addDmxGroupCondition(
      dmx,
      "nested-group",
      { type: "condition", id: topGroupId },
      "any",
    );
    addDmxChunkRefCondition(
      dmx,
      "cond-1",
      { type: "condition", id: nestedGroupId },
      chunk2Id,
      5,
      15,
    );

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;

    const topCond = estaDmx.chunks["0"].mappingGroups[0].conditions?.[0];
    expect(topCond?.type).toBe("group");
    if (topCond?.type === "group") {
      expect(topCond.value.condMatch).toBe("all");
      expect(topCond.value.conditions).toHaveLength(1);

      const nestedCond = topCond.value.conditions[0];
      expect(nestedCond.type).toBe("group");
      if (nestedCond.type === "group") {
        expect(nestedCond.value.condMatch).toBe("any");
        expect(nestedCond.value.conditions).toHaveLength(1);
        expect(nestedCond.value.conditions[0]).toEqual({
          type: "simple",
          value: {
            chunk: "1",
            chunkStart: 5,
            chunkEnd: 15,
          },
        });
      }
    }
  });

  test("does not export empty chunks", () => {
    const editor = createMinimalEditor();
    editor.dmxSerializer = createDmxState();

    const result = exportDeviceClass(editor);

    expect(result.serializers).toBeUndefined();
  });

  test("omits unmappedParams field when not present (not undefined)", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunkId = addDmxChunk(dmx, "chunk-1", [0]);
    addDmxMappingGroup(dmx, "mg-1", chunkId, 0, [
      {
        mappedParam: { codexId: "intensity" },
        ranges: [{ chunkStart: 0, chunkEnd: 255, start: 0, end: 1 }],
      },
    ]);

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;
    const mapping = estaDmx.chunks["0"].mappingGroups[0].mappings[0];

    // Should not have the key at all, not even as undefined
    expect("unmappedParams" in mapping).toBe(false);
  });

  test("omits conditions field when not present (not undefined)", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunkId = addDmxChunk(dmx, "chunk-1", [0]);
    addDmxMappingGroup(dmx, "mg-1", chunkId, 0, [
      {
        mappedParam: { codexId: "intensity" },
        ranges: [{ chunkStart: 0, chunkEnd: 255, start: 0, end: 1 }],
      },
    ]);

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;
    const mappingGroup = estaDmx.chunks["0"].mappingGroups[0];

    // Should not have the key at all, not even as undefined
    expect("conditions" in mappingGroup).toBe(false);
  });

  test("exports complete DMX with multiple chunks, mapping groups, and conditions", () => {
    const editor = createMinimalEditor();
    const dmx = createDmxState();
    editor.dmxSerializer = dmx;

    const chunk1Id = addDmxChunk(dmx, "chunk-1", [0, 1]);
    const chunk2Id = addDmxChunk(dmx, "chunk-2", [2]);
    addDmxMappingGroup(dmx, "mg-1", chunk1Id, 0, [
      {
        mappedParam: { codexId: "pan" },
        ranges: [{ chunkStart: 0, chunkEnd: 65535, start: -180, end: 180 }],
      },
    ]);
    const mg2Id = addDmxMappingGroup(dmx, "mg-2", chunk2Id, 0, [
      {
        mappedParam: { codexId: "intensity" },
        ranges: [{ chunkStart: 0, chunkEnd: 255, start: 0, end: 100 }],
      },
    ]);
    addDmxChunkRefCondition(
      dmx,
      "cond-1",
      { type: "mappingGroup", id: mg2Id },
      chunk1Id,
      100,
      200,
    );

    const result = exportDeviceClass(editor);
    const estaDmx = result.serializers!.dmx!.value.default!;

    expect(Object.keys(estaDmx.chunks)).toHaveLength(2);
    expect(estaDmx.chunks["0-1"]).toBeDefined();
    expect(estaDmx.chunks["2"]).toBeDefined();
    expect(
      estaDmx.chunks["0-1"].mappingGroups[0].mappings[0].mappedParam,
    ).toEqual({ id: "pan" });
    expect(
      estaDmx.chunks["2"].mappingGroups[0].mappings[0].mappedParam,
    ).toEqual({ id: "intensity" });
    expect(estaDmx.chunks["2"].mappingGroups[0].conditions?.[0]).toEqual({
      type: "simple",
      value: {
        chunk: "0-1",
        chunkStart: 100,
        chunkEnd: 200,
      },
    });
  });
});

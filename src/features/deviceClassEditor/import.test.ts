import { describe, test, expect } from "vitest";
import { getImportedDeviceClassEditor } from "./import";
import { CodexId, LocalizationKey } from "app/persistentState";
import type {
  DeviceClass,
  ParameterClass,
  StructureClass,
  SerializerClass,
  ResourceClass,
  CommandClass,
  Parameter,
  Resource,
  Command,
  EstaDmx,
  Chunk,
  MappingGroup,
  Mapping,
  MappingRange,
  Trigger,
  Condition,
} from "@cpwg-community/delver";

// ============================================================================
// Test Helpers
// ============================================================================

function createMinimalDeviceClass(): DeviceClass {
  return {
    libraries: {},
    "@description": "test.description",
    publishDate: "2024-01-01T00:00:00.000Z",
    author: "Test Author",
    info: {
      manufacturer: {
        name: "Test Manufacturer",
        url: "https://example.com",
        estaId: "1234",
      },
      model: {
        name: "Test Model",
        category: "lighting",
        subcategory: "fixed-profile",
      },
      compatibility: {
        firmwareVersions: ["1.0.0", "2.0.0"],
      },
    },
    history: { "1.0.0": "Initial release" },
  };
}

// Parameter class helpers
type ParamClassOpts = Partial<Omit<ParameterClass, "@name">> & {
  name?: string;
  description?: string;
};

function addParamClass(
  dc: DeviceClass,
  codexId: string,
  opts: ParamClassOpts = {},
): void {
  dc.deviceLibrary ??= {};
  dc.deviceLibrary.parameterClasses ??= {};
  const { name, description, ...rest } = opts;
  dc.deviceLibrary.parameterClasses[codexId] = {
    "@name": name ?? `${codexId}.name`,
    ...(description && { "@description": description }),
    dataType: rest.dataType ?? "number",
    ...rest,
  };
}

// Structure class helpers
type StructClassOpts = Partial<Omit<StructureClass, "@name">> & {
  name?: string;
  description?: string;
};

function addStructClass(
  dc: DeviceClass,
  codexId: string,
  opts: StructClassOpts = {},
): void {
  dc.deviceLibrary ??= {};
  dc.deviceLibrary.structureClasses ??= {};
  const { name, description, ...rest } = opts;
  dc.deviceLibrary.structureClasses[codexId] = {
    "@name": name ?? `${codexId}.name`,
    ...(description && { "@description": description }),
    ...rest,
  };
}

// Serializer class helpers
type SerClassOpts = Partial<Omit<SerializerClass, "@name">> & {
  name?: string;
  description?: string;
};

function addSerClass(
  dc: DeviceClass,
  codexId: string,
  opts: SerClassOpts = {},
): void {
  dc.deviceLibrary ??= {};
  dc.deviceLibrary.serializerClasses ??= {};
  const { name, description } = opts;
  dc.deviceLibrary.serializerClasses[codexId] = {
    "@name": name ?? `${codexId}.name`,
    ...(description && { "@description": description }),
  };
}

// Resource class helpers
type ResClassOpts = Partial<Omit<ResourceClass, "@name">> & {
  name?: string;
  description?: string;
};

function addResClass(
  dc: DeviceClass,
  codexId: string,
  opts: ResClassOpts = {},
): void {
  dc.deviceLibrary ??= {};
  dc.deviceLibrary.resourceClasses ??= {};
  const { name, description, ...rest } = opts;
  dc.deviceLibrary.resourceClasses[codexId] = {
    "@name": name ?? `${codexId}.name`,
    ...(description && { "@description": description }),
    mediaType: rest.mediaType ?? ["image/png"],
    ...rest,
  };
}

// Command class helpers
type CmdClassOpts = Partial<Omit<CommandClass, "@name">> & {
  name?: string;
  description?: string;
};

function addCmdClass(
  dc: DeviceClass,
  codexId: string,
  opts: CmdClassOpts = {},
): void {
  dc.deviceLibrary ??= {};
  dc.deviceLibrary.commandClasses ??= {};
  const { name, description, ...rest } = opts;
  dc.deviceLibrary.commandClasses[codexId] = {
    "@name": name ?? `${codexId}.name`,
    ...(description && { "@description": description }),
    ...rest,
  };
}

// Parameter helpers
type ParamOpts = Partial<Omit<Parameter, "class" | "access" | "lifetime">> & {
  friendlyName?: string;
  access?: Parameter["access"];
  lifetime?: Parameter["lifetime"];
};

function addParam(
  dc: DeviceClass,
  codexId: string,
  classId: string,
  opts: ParamOpts = {},
): void {
  dc.parameters ??= {};
  const { friendlyName, ...rest } = opts;
  dc.parameters[codexId] = {
    class: classId,
    access: rest.access ?? ["readActual"],
    lifetime: rest.lifetime ?? "static",
    ...(friendlyName && { "@friendlyName": friendlyName }),
    ...rest,
  };
}

// Resource helpers
type ResOpts = Partial<Omit<Resource, "class" | "access" | "lifetime">> & {
  access?: Resource["access"];
  lifetime?: Resource["lifetime"];
};

function addRes(
  dc: DeviceClass,
  codexId: string,
  classId: string,
  opts: ResOpts = {},
): void {
  dc.resources ??= {};
  dc.resources[codexId] = {
    class: classId,
    access: opts.access ?? ["read"],
    lifetime: opts.lifetime ?? "static",
    ...opts,
  };
}

// Command helpers
type CmdOpts = Partial<Omit<Command, "class" | "completionNotification">> & {
  friendlyName?: string;
  completionNotification?: boolean;
};

function addCmd(
  dc: DeviceClass,
  codexId: string,
  classId: string,
  opts: CmdOpts = {},
): void {
  dc.commands ??= {};
  const { friendlyName, ...rest } = opts;
  dc.commands[codexId] = {
    class: classId,
    completionNotification: rest.completionNotification ?? false,
    ...(friendlyName && { "@friendlyName": friendlyName }),
    ...rest,
  };
}

// Localization helpers
function addLocalization(
  dc: DeviceClass,
  lang: string,
  key: string,
  value: string,
): void {
  dc.localizations ??= {};
  dc.localizations[lang] ??= { strings: {} };
  dc.localizations[lang].strings ??= {};
  dc.localizations[lang].strings[key] = value;
}

// DMX helpers
function createEstaDmx(): EstaDmx {
  return { chunks: {} };
}

function createChunk(offsets: number[]): Chunk {
  return { offsets, mappingGroups: [] };
}

function createMappingGroup(opts?: {
  conditions?: Condition[];
  mappings?: Mapping[];
  triggers?: Trigger[];
}): MappingGroup {
  return {
    conditions: opts?.conditions,
    mappings: opts?.mappings,
    triggers: opts?.triggers,
  };
}

function createMapping(
  mappedParamId: string,
  ranges: MappingRange[],
  opts?: {
    mappedParamIndex?: number;
    unmappedParams?: Mapping["unmappedParams"];
  },
): Mapping {
  return {
    mappedParam: {
      id: mappedParamId,
      index: opts?.mappedParamIndex,
    },
    ranges,
    unmappedParams: opts?.unmappedParams,
  };
}

function createRangeMapping(
  chunkStart: number,
  chunkEnd: number,
  opts?: { start?: number | boolean; end?: number | boolean },
): MappingRange {
  return {
    start: opts?.start,
    end: opts?.end,
    chunkValues: { type: "range", value: { start: chunkStart, end: chunkEnd } },
  };
}

function createSequenceMapping(
  steps: Array<{
    chunkStart: number;
    chunkEnd: number;
    hold: { milliseconds: number } | "indefinite";
  }>,
  opts?: { start?: number | boolean; end?: number | boolean },
): MappingRange {
  return {
    start: opts?.start,
    end: opts?.end,
    chunkValues: { type: "sequence", value: steps },
  };
}

function createTrigger(
  command: string,
  mappings: Trigger["mappings"],
): Trigger {
  return { command, mappings };
}

function addDmxSerializer(dc: DeviceClass, estaDmx: EstaDmx): void {
  dc.serializers ??= {};
  dc.serializers["dmx"] = {
    type: "EstaDmx",
    value: {
      access: ["read"],
      lifetime: "static",
      default: estaDmx,
    },
  };
}

const TEST_ORG = { type: "org" as const, id: "test-org" };

// ============================================================================
// Tests
// ============================================================================

describe("getImportedDeviceClassEditor", () => {
  describe("basic metadata", () => {
    test("imports device class metadata", () => {
      const dc = createMinimalDeviceClass();
      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(editor.deviceClassId).toBe("test-id");
      expect(editor.deviceClassVersion).toBe("1.0.0");
      expect(editor.basicData.publishDate).toBe("2024-01-01T00:00:00.000Z");
      expect(editor.basicData.author).toBe("Test Author");
      expect(editor.basicData.manufacturerName).toBe("Test Manufacturer");
      expect(editor.basicData.manufacturerUrl).toBe("https://example.com");
      expect(editor.basicData.manufacturerEstaId).toBe("1234");
      expect(editor.basicData.modelName).toBe("Test Model");
      expect(editor.basicData.modelCategory).toBe("lighting");
      expect(editor.basicData.modelSubcategory).toBe("fixed-profile");
      expect(editor.basicData.compatibleFirmwareVersions).toEqual([
        "1.0.0",
        "2.0.0",
      ]);
    });

    test("imports history", () => {
      const dc = createMinimalDeviceClass();
      dc.history = { "1.0.0": "Initial", "2.0.0": "Update" };
      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(editor.basicData.history).toEqual({
        "1.0.0": "Initial",
        "2.0.0": "Update",
      });
    });

    test("imports libraries", () => {
      const dc = createMinimalDeviceClass();
      dc.libraries = { "org.example.lib": "1.0.0", "org.other.lib": "2.0.0" };
      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(editor.libraries).toEqual({
        "org.example.lib": "1.0.0",
        "org.other.lib": "2.0.0",
      });
    });
  });

  describe("localizations", () => {
    test("imports localizations for multiple languages", () => {
      const dc = createMinimalDeviceClass();
      addLocalization(dc, "en", "test.key", "English text");
      addLocalization(dc, "fr", "test.key", "French text");
      addLocalization(dc, "en", "other.key", "Other English");

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(
        editor.localizations[LocalizationKey("test.key")].strings["en"],
      ).toBe("English text");
      expect(
        editor.localizations[LocalizationKey("test.key")].strings["fr"],
      ).toBe("French text");
      expect(
        editor.localizations[LocalizationKey("other.key")].strings["en"],
      ).toBe("Other English");
    });

    test("handles empty localizations", () => {
      const dc = createMinimalDeviceClass();
      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(Object.keys(editor.localizations)).toHaveLength(0);
    });
  });

  describe("parameter classes", () => {
    test("imports parameter class with basic properties", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.param", {
        dataType: "number",
        unit: { name: "ratio" },
        name: "Test Param",
        description: "A test parameter",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const paramClasses = Object.values(editor.parameterClasses);
      expect(paramClasses).toHaveLength(1);
      expect(paramClasses[0].codexId).toBe("test.param");
      expect(paramClasses[0].dataType).toBe("number");
      expect(paramClasses[0].unit).toEqual({ name: "ratio" });
      expect(paramClasses[0].localized.name).toBe("Test Param");
      expect(paramClasses[0].localized.description).toBe("A test parameter");
    });

    test("imports parameter class with enum choices", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.enum", {
        dataType: "enum",
        choices: [
          { id: "choice1", "@name": "Choice One" },
          { id: "choice2", "@name": "Choice Two" },
        ],
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const enumChoices = Object.values(editor.enumChoices);
      expect(enumChoices).toHaveLength(2);
      expect(enumChoices[0].codexId).toBe("choice1");
      expect(enumChoices[0].localized.name).toBe("Choice One");
      expect(enumChoices[1].codexId).toBe("choice2");
      expect(enumChoices[1].localized.name).toBe("Choice Two");
    });

    test("imports multiple parameter classes", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "param.one", { dataType: "number" });
      addParamClass(dc, "param.two", { dataType: "boolean" });
      addParamClass(dc, "param.three", { dataType: "string" });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(Object.values(editor.parameterClasses)).toHaveLength(3);
    });
  });

  describe("structure classes", () => {
    test("imports structure class", () => {
      const dc = createMinimalDeviceClass();
      addStructClass(dc, "test.struct", {
        multipleAllowed: false,
        name: "Test Structure",
        description: "A test structure",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const structClasses = Object.values(editor.structureClasses);
      expect(structClasses).toHaveLength(1);
      expect(structClasses[0].codexId).toBe("test.struct");
      expect(structClasses[0].multipleAllowed).toBe(false);
      expect(structClasses[0].localized.name).toBe("Test Structure");
    });
  });

  describe("serializer classes", () => {
    test("imports serializer class", () => {
      const dc = createMinimalDeviceClass();
      addSerClass(dc, "test.serializer", {
        name: "Test Serializer",
        description: "A test serializer",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const serClasses = Object.values(editor.serializerClasses);
      expect(serClasses).toHaveLength(1);
      expect(serClasses[0].codexId).toBe("test.serializer");
      expect(serClasses[0].localized.name).toBe("Test Serializer");
    });
  });

  describe("resource classes", () => {
    test("imports resource class", () => {
      const dc = createMinimalDeviceClass();
      addResClass(dc, "test.resource", {
        mediaType: ["image/png", "image/jpeg"],
        name: "Test Resource",
        description: "A test resource",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const resClasses = Object.values(editor.resourceClasses);
      expect(resClasses).toHaveLength(1);
      expect(resClasses[0].codexId).toBe("test.resource");
      expect(resClasses[0].mediaType).toEqual(["image/png", "image/jpeg"]);
      expect(resClasses[0].localized.name).toBe("Test Resource");
    });
  });

  describe("command classes", () => {
    test("imports command class without arguments or returns", () => {
      const dc = createMinimalDeviceClass();
      addCmdClass(dc, "test.command", {
        name: "Test Command",
        description: "A test command",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const cmdClasses = Object.values(editor.commandClasses);
      expect(cmdClasses).toHaveLength(1);
      expect(cmdClasses[0].codexId).toBe("test.command");
      expect(cmdClasses[0].localized.name).toBe("Test Command");
    });

    test("imports command class with arguments", () => {
      const dc = createMinimalDeviceClass();
      addCmdClass(dc, "test.command", {
        arguments: {
          arg1: {
            "@name": "Argument One",
            "@description": "First argument",
            dataType: "number",
            unit: { name: "second" },
            required: true,
          },
          arg2: {
            "@name": "Argument Two",
            dataType: "string",
            required: false,
          },
        },
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const args = Object.values(editor.commandClassArguments);
      expect(args).toHaveLength(2);

      const arg1 = args.find((a) => a.codexId === "arg1");
      expect(arg1?.dataType).toBe("number");
      expect(arg1?.unit).toEqual({ name: "second" });
      expect(arg1?.required).toBe(true);
      expect(arg1?.localized.name).toBe("Argument One");
    });

    test("imports command class with return values", () => {
      const dc = createMinimalDeviceClass();
      addCmdClass(dc, "test.command", {
        returns: {
          status: {
            "@name": "Status",
            dataType: "boolean",
            required: true,
          },
        },
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const returns = Object.values(editor.commandClassReturnValues);
      expect(returns).toHaveLength(1);
      expect(returns[0].codexId).toBe("status");
      expect(returns[0].dataType).toBe("boolean");
      expect(returns[0].required).toBe(true);
    });

    test("imports command class argument with enum choices", () => {
      const dc = createMinimalDeviceClass();
      addCmdClass(dc, "test.command", {
        arguments: {
          mode: {
            "@name": "Mode",
            dataType: "enum",
            required: true,
            choices: [
              { id: "fast", "@name": "Fast Mode" },
              { id: "slow", "@name": "Slow Mode" },
            ],
          },
        },
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const enumChoices = Object.values(editor.enumChoices);
      expect(enumChoices).toHaveLength(2);
      expect(enumChoices.find((c) => c.codexId === "fast")).toBeDefined();
      expect(enumChoices.find((c) => c.codexId === "slow")).toBeDefined();
    });
  });

  describe("parameters", () => {
    test("imports parameter with local class reference", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.param.class");
      addParam(dc, "brightness", "test.param.class", {
        access: ["readActual", "write"],
        lifetime: "runtime",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const params = Object.values(editor.parameters);
      expect(params).toHaveLength(1);
      expect(params[0].codexId).toBe("brightness");
      expect(params[0].class.type).toBe("local");
      expect(params[0].class.codexId).toBe("test.param.class");
      expect(params[0].access).toEqual(["readActual", "write"]);
      expect(params[0].lifetime).toBe("runtime");
    });

    test("imports parameter with imported class reference", () => {
      const dc = createMinimalDeviceClass();
      dc.libraries = { "org.example.lib": "1.0.0" };
      addParam(dc, "intensity", "example.intensity", {
        library: "org.example.lib",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const params = Object.values(editor.parameters);
      expect(params[0].class.type).toBe("imported");
      if (params[0].class.type === "imported") {
        expect(params[0].class.library).toBe("org.example.lib");
        expect(params[0].class.codexId).toBe("example.intensity");
      }
    });

    test("imports parameter with fixed count", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.param");
      addParam(dc, "color", "test.param", {
        count: { type: "fixed", value: 3 },
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const params = Object.values(editor.parameters);
      expect(params[0].count).toEqual({ type: "fixed", value: 3 });
    });

    test("imports parameter with dynamic count", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.param");
      addParam(dc, "frames", "test.param", {
        count: { type: "dynamic", value: { minimum: 1, maximum: 10 } },
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const params = Object.values(editor.parameters);
      expect(params[0].count).toEqual({ type: "dynamic", min: 1, max: 10 });
    });

    test("imports parameter with all optional fields", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.param");
      addParam(dc, "value", "test.param", {
        atomicIdentifier: "atomic-id",
        minimum: 0,
        maximum: 100,
        minimumModifier: "minMod",
        maximumModifier: "maxMod",
        default: 50,
        wrapping: true,
        friendlyName: "Friendly Value",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const param = Object.values(editor.parameters)[0];
      expect(param.atomicIdentifier).toBe("atomic-id");
      expect(param.minimum).toBe(0);
      expect(param.maximum).toBe(100);
      expect(param.minimumModifier).toBe("minMod");
      expect(param.maximumModifier).toBe("maxMod");
      expect(param.default).toBe(50);
      expect(param.wrapping).toBe(true);
      expect(param.localized.friendlyName).toBe("Friendly Value");
    });

    test("imports parameter with enum exclusions", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.enum", { dataType: "enum" });
      addParam(dc, "mode", "test.enum", {
        choices: { excluded: ["excluded1", "excluded2"] },
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const param = Object.values(editor.parameters)[0];
      expect(param.enumExclusions).toEqual(["excluded1", "excluded2"]);
    });

    test("imports parameter with additional enum choices", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.enum", { dataType: "enum" });
      addParam(dc, "mode", "test.enum", {
        choices: {
          additional: [
            { id: "custom1", "@name": "Custom One" },
            { id: "custom2", "@name": "Custom Two" },
          ],
        },
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const additionalChoices = Object.values(editor.enumChoices).filter(
        (c) => c.parent.type === "paramAdditional",
      );
      expect(additionalChoices).toHaveLength(2);
    });

    test("populates parameterEditors array", () => {
      const dc = createMinimalDeviceClass();
      addParamClass(dc, "test.param");
      addParam(dc, "param1", "test.param");
      addParam(dc, "param2", "test.param");

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(editor.parameterEditors).toHaveLength(2);
    });
  });

  describe("resources", () => {
    test("imports resource with local class reference", () => {
      const dc = createMinimalDeviceClass();
      addResClass(dc, "test.resource");
      addRes(dc, "logo", "test.resource", {
        mediaType: "image/png",
        default: "logo.png",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const resources = Object.values(editor.resources);
      expect(resources).toHaveLength(1);
      expect(resources[0].codexId).toBe("logo");
      expect(resources[0].class.type).toBe("local");
      expect(resources[0].mediaType).toBe("image/png");
      expect(resources[0].default).toBe("logo.png");
    });

    test("populates resourceEditors array", () => {
      const dc = createMinimalDeviceClass();
      addResClass(dc, "test.resource");
      addRes(dc, "res1", "test.resource");
      addRes(dc, "res2", "test.resource");

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(editor.resourceEditors).toHaveLength(2);
    });
  });

  describe("commands", () => {
    test("imports command with local class reference", () => {
      const dc = createMinimalDeviceClass();
      addCmdClass(dc, "test.command");
      addCmd(dc, "reset", "test.command", {
        completionNotification: true,
        friendlyName: "Reset Device",
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const commands = Object.values(editor.commands);
      expect(commands).toHaveLength(1);
      expect(commands[0].codexId).toBe("reset");
      expect(commands[0].class.type).toBe("local");
      expect(commands[0].completionNotification).toBe(true);
      expect(commands[0].localized.friendlyName).toBe("Reset Device");
    });

    test("imports command with argument enum exclusions", () => {
      const dc = createMinimalDeviceClass();
      addCmdClass(dc, "test.command", {
        arguments: {
          mode: { "@name": "Mode", dataType: "enum", required: true },
        },
      });
      addCmd(dc, "configure", "test.command", {
        argumentChoices: {
          mode: { excluded: ["disabled", "maintenance"] },
        },
      });

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      const cmd = Object.values(editor.commands)[0];
      expect(cmd.argEnumExclusions?.[CodexId("mode")]).toEqual([
        "disabled",
        "maintenance",
      ]);
    });

    test("populates commandEditors array", () => {
      const dc = createMinimalDeviceClass();
      addCmdClass(dc, "test.command");
      addCmd(dc, "cmd1", "test.command");
      addCmd(dc, "cmd2", "test.command");

      const editor = getImportedDeviceClassEditor(
        TEST_ORG,
        "test-id",
        "1.0.0",
        dc,
      );

      expect(editor.commandEditors).toHaveLength(2);
    });
  });
});

describe("DMX serializer import", () => {
  test("imports simple DMX with one chunk and one mapping group", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();
    const chunk = createChunk([0]);
    chunk.mappingGroups.push(
      createMappingGroup({
        mappings: [createMapping("intensity", [createRangeMapping(0, 255)])],
      }),
    );
    dmx.chunks["0"] = chunk;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    expect(editor.dmxSerializer).toBeDefined();
    expect(Object.keys(editor.dmxSerializer!.chunks)).toHaveLength(1);
    expect(Object.keys(editor.dmxSerializer!.mappingGroups)).toHaveLength(1);
  });

  test("imports chunk offsets correctly", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();
    dmx.chunks["0-1-2"] = createChunk([0, 1, 2]);
    dmx.chunks["0-1-2"].mappingGroups.push(createMappingGroup());
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const chunks = Object.values(editor.dmxSerializer!.chunks);
    expect(chunks[0].offsets).toEqual([0, 1, 2]);
  });

  test("imports mapping with parameter reference", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();
    const chunk = createChunk([0]);
    chunk.mappingGroups.push(
      createMappingGroup({
        mappings: [
          createMapping("pan", [createRangeMapping(0, 65535)], {
            mappedParamIndex: 2,
          }),
        ],
      }),
    );
    dmx.chunks["0"] = chunk;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const mapping = Object.values(editor.dmxSerializer!.mappingGroups)[0]
      .mappings[0];
    expect(mapping.mappedParam.codexId).toBe("pan");
    expect(mapping.mappedParam.index).toBe(2);
  });

  test("imports mapping range with chunkValues (range type)", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();
    const chunk = createChunk([0]);
    chunk.mappingGroups.push(
      createMappingGroup({
        mappings: [
          createMapping("intensity", [
            createRangeMapping(0, 255, { start: 0, end: 100 }),
          ]),
        ],
      }),
    );
    dmx.chunks["0"] = chunk;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const range = Object.values(editor.dmxSerializer!.mappingGroups)[0]
      .mappings[0].ranges[0];
    expect(range.start).toBe(0);
    expect(range.end).toBe(100);
    expect(range.chunkValues).toEqual({
      type: "range",
      chunkStart: 0,
      chunkEnd: 255,
    });
  });

  test("imports mapping range with chunkValues (sequence type)", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();
    const chunk = createChunk([0]);
    chunk.mappingGroups.push(
      createMappingGroup({
        mappings: [
          createMapping("strobe", [
            createSequenceMapping(
              [
                { chunkStart: 0, chunkEnd: 127, hold: { milliseconds: 100 } },
                { chunkStart: 128, chunkEnd: 255, hold: "indefinite" },
              ],
              { start: 0, end: 1 },
            ),
          ]),
        ],
      }),
    );
    dmx.chunks["0"] = chunk;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const range = Object.values(editor.dmxSerializer!.mappingGroups)[0]
      .mappings[0].ranges[0];
    expect(range.chunkValues.type).toBe("sequence");
    if (range.chunkValues.type === "sequence") {
      expect(range.chunkValues.steps).toHaveLength(2);
      expect(range.chunkValues.steps[0]).toEqual({
        chunkStart: 0,
        chunkEnd: 127,
        hold: { milliseconds: 100 },
      });
      expect(range.chunkValues.steps[1]).toEqual({
        chunkStart: 128,
        chunkEnd: 255,
        hold: "indefinite",
      });
    }
  });

  test("imports unmapped parameters", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();
    const chunk = createChunk([0]);
    chunk.mappingGroups.push(
      createMappingGroup({
        mappings: [
          createMapping("intensity", [createRangeMapping(0, 255)], {
            unmappedParams: [
              { parameter: { id: "pan", index: 1 }, start: 0, end: 180 },
            ],
          }),
        ],
      }),
    );
    dmx.chunks["0"] = chunk;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const unmapped = Object.values(editor.dmxSerializer!.mappingGroups)[0]
      .mappings[0].unmappedParams;
    expect(unmapped).toHaveLength(1);
    expect(unmapped![0].parameter.codexId).toBe("pan");
    expect(unmapped![0].parameter.index).toBe(1);
    expect(unmapped![0].start).toBe(0);
    expect(unmapped![0].end).toBe(180);
  });

  test("imports triggers", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();
    const chunk = createChunk([0]);
    chunk.mappingGroups.push(
      createMappingGroup({
        triggers: [
          createTrigger("reset", [
            {
              conditions: {
                mode: { argumentMin: 1, argumentMax: 5 },
              },
              sequence: [
                { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 500 } },
              ],
            },
          ]),
        ],
      }),
    );
    dmx.chunks["0"] = chunk;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const triggers = Object.values(editor.dmxSerializer!.mappingGroups)[0]
      .triggers;
    expect(triggers).toHaveLength(1);
    expect(triggers[0].command).toBe("reset");
    expect(triggers[0].mappings).toHaveLength(1);
    expect(triggers[0].mappings[0].conditions["mode"]).toEqual({
      argumentMin: 1,
      argumentMax: 5,
    });
    expect(triggers[0].mappings[0].sequence).toHaveLength(1);
  });

  test("imports chunk reference condition", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();

    const chunk1 = createChunk([0]);
    const chunk2 = createChunk([1]);

    chunk1.mappingGroups.push(
      createMappingGroup({
        conditions: [{ chunk: "1", chunkStart: 10, chunkEnd: 20 }],
        mappings: [createMapping("intensity", [createRangeMapping(0, 255)])],
      }),
    );
    chunk2.mappingGroups.push(createMappingGroup());

    dmx.chunks["0"] = chunk1;
    dmx.chunks["1"] = chunk2;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const conditions = Object.values(editor.dmxSerializer!.conditions);
    expect(conditions).toHaveLength(1);
    expect(conditions[0].conditionType).toBe("chunkRef");
    if (conditions[0].conditionType === "chunkRef") {
      expect(conditions[0].chunkStart).toBe(10);
      expect(conditions[0].chunkEnd).toBe(20);
    }
  });

  test("imports group condition with nested conditions", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();

    const chunk1 = createChunk([0]);
    const chunk2 = createChunk([1]);

    chunk1.mappingGroups.push(
      createMappingGroup({
        conditions: [
          {
            match: "any",
            conditions: [
              { chunk: "1", chunkStart: 0, chunkEnd: 50 },
              { chunk: "1", chunkStart: 100, chunkEnd: 150 },
            ],
          },
        ],
      }),
    );
    chunk2.mappingGroups.push(createMappingGroup());

    dmx.chunks["0"] = chunk1;
    dmx.chunks["1"] = chunk2;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const conditions = Object.values(editor.dmxSerializer!.conditions);
    expect(conditions).toHaveLength(3); // 1 group + 2 chunk refs

    const groupCond = conditions.find((c) => c.conditionType === "group");
    expect(groupCond).toBeDefined();
    if (groupCond?.conditionType === "group") {
      expect(groupCond.match).toBe("any");
    }
  });

  test("imports multiple mapping groups with correct indices", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();
    const chunk = createChunk([0]);

    chunk.mappingGroups.push(
      createMappingGroup({
        mappings: [createMapping("param1", [createRangeMapping(0, 100)])],
      }),
    );
    chunk.mappingGroups.push(
      createMappingGroup({
        mappings: [createMapping("param2", [createRangeMapping(0, 200)])],
      }),
    );
    chunk.mappingGroups.push(
      createMappingGroup({
        mappings: [createMapping("param3", [createRangeMapping(0, 300)])],
      }),
    );

    dmx.chunks["0"] = chunk;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    const mappingGroups = Object.values(editor.dmxSerializer!.mappingGroups);
    expect(mappingGroups).toHaveLength(3);

    const indices = mappingGroups.map((mg) => mg.index).sort();
    expect(indices).toEqual([0, 1, 2]);
  });

  test("handles undefined dmxSerializer", () => {
    const dc = createMinimalDeviceClass();
    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    expect(editor.dmxSerializer).toBeUndefined();
  });

  test("imports multiple chunks with their respective mapping groups", () => {
    const dc = createMinimalDeviceClass();
    const dmx = createEstaDmx();

    const chunk1 = createChunk([0, 1]);
    chunk1.mappingGroups.push(
      createMappingGroup({
        mappings: [createMapping("pan", [createRangeMapping(0, 65535)])],
      }),
    );

    const chunk2 = createChunk([2]);
    chunk2.mappingGroups.push(
      createMappingGroup({
        mappings: [createMapping("tilt", [createRangeMapping(0, 65535)])],
      }),
    );

    dmx.chunks["0-1"] = chunk1;
    dmx.chunks["2"] = chunk2;
    addDmxSerializer(dc, dmx);

    const editor = getImportedDeviceClassEditor(
      TEST_ORG,
      "test-id",
      "1.0.0",
      dc,
    );

    expect(Object.keys(editor.dmxSerializer!.chunks)).toHaveLength(2);
    expect(Object.keys(editor.dmxSerializer!.mappingGroups)).toHaveLength(2);

    // Verify mapping groups reference correct chunks
    const mappingGroups = Object.values(editor.dmxSerializer!.mappingGroups);
    const chunkIds = new Set(mappingGroups.map((mg) => mg.chunkId));
    expect(chunkIds.size).toBe(2);
  });
});

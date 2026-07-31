import { describe, expect, test } from "vitest";
import { DeviceClass, Library as FCLibrary } from "@cpwg-community/delver";
import { CodexId, EntityId } from "app/persistentState";
import { LibraryStore, normalizeLibrary } from "codex/library";
import { OrgId } from "utils/utils";
import { getImportedDeviceClassEditor } from "./import";
import { resolveClassRef } from "./classResolution";
import {
  lookupCommandClass,
  lookupParameterClass,
  lookupResourceClass,
} from "./stateTransformations";

const LIB_ID = "org.test.lib.test_lib";
const LIB_VERSION = "1.0.0";
const ORG_ID: OrgId = { type: "org", id: "test-org" };

const classes = {
  parameterClasses: {
    parameter1: {
      "@name": "parameter_1",
      "@description": "parameter_1_desc",
      dataType: "number" as const,
      unit: { name: "hertz" as const },
    },
    "category/parameter2": {
      "@name": "parameter_2",
      dataType: "boolean" as const,
    },
    mode: {
      "@name": "mode_name",
      dataType: "enum" as const,
      choices: [
        { id: "auto", "@name": "auto_name" },
        { id: "manual", "@name": "manual_name" },
      ],
    },
  },
  resourceClasses: {
    icon: { "@name": "icon_name", mediaType: ["image/png"] },
  },
  commandClasses: {
    reset: {
      "@name": "reset_name",
      "@description": "reset_desc",
      arguments: {
        target: {
          "@name": "target_name",
          dataType: "enum" as const,
          required: true,
          choices: [{ id: "all", "@name": "all_name" }],
        },
      },
      returns: {
        status: {
          "@name": "status_name",
          dataType: "string" as const,
          required: false,
        },
      },
    },
  },
};

const localizations = {
  "en-US": {
    strings: {
      lib_desc: "Test Library",
      device_desc: "Test Device",
      parameter_1: "Parameter One",
      parameter_1_desc: "The first parameter",
      mode_name: "Mode",
      auto_name: "Auto",
      manual_name: "Manual",
      icon_name: "Icon",
      reset_name: "Reset",
      reset_desc: "Resets the device",
      target_name: "Target",
      all_name: "All",
      status_name: "Status",
    },
  },
};

const fcLibrary: FCLibrary = {
  "@description": "lib_desc",
  publishDate: "2026-01-01",
  author: "Test Author",
  ...classes,
  localizations,
};

const store: LibraryStore = {
  [LIB_ID]: { [LIB_VERSION]: normalizeLibrary(LIB_ID, LIB_VERSION, fcLibrary) },
};

const deviceClass: DeviceClass = {
  "@description": "device_desc",
  publishDate: "2026-01-01",
  author: "Test Author",
  history: {},
  info: {
    manufacturer: { name: "Test Manufacturer" },
    model: {
      name: "Test Model",
      category: "lighting",
      subcategory: "fixed-profile",
    },
  },
  libraries: { [LIB_ID]: LIB_VERSION },
  deviceLibrary: classes,
  localizations,
};

const editor = getImportedDeviceClassEditor(
  ORG_ID,
  "test-device",
  "1.0.0",
  deviceClass,
);

function localClassId(
  table: Record<EntityId, { codexId: CodexId }>,
  codexId: string,
): EntityId {
  const entry = Object.entries(table).find(([, c]) => c.codexId === codexId);
  if (!entry) {
    throw new Error(`No local class with codexId ${codexId}`);
  }
  return EntityId(entry[0]);
}

function resolveImported(
  codexId: string,
  kind: "parameterClasses" | "resourceClasses" | "commandClasses",
) {
  return resolveClassRef(
    { type: "imported", library: LIB_ID, codexId: CodexId(codexId) },
    editor.libraries,
    editor,
    store,
    kind,
  );
}

function resolveLocal(
  codexId: string,
  kind: "parameterClasses" | "resourceClasses" | "commandClasses",
) {
  return resolveClassRef(
    { type: "local", id: localClassId(editor[kind], codexId) },
    editor.libraries,
    editor,
    store,
    kind,
  );
}

describe("parameter class lookup", () => {
  test("resolves an imported class with its localized strings", () => {
    expect(
      lookupParameterClass(
        resolveImported("parameter1", "parameterClasses")!,
        "en-US",
      ),
    ).toStrictEqual({
      codexId: "parameter1",
      name: {
        desiredLocale: "en-US",
        locale: "en-US",
        value: "Parameter One",
      },
      description: {
        desiredLocale: "en-US",
        locale: "en-US",
        value: "The first parameter",
      },
      dataType: "number",
      unit: { name: "hertz" as const },
      choices: [],
    });
  });

  test("resolves an identifier containing slashes", () => {
    const cls = lookupParameterClass(
      resolveImported("category/parameter2", "parameterClasses")!,
      "en-US",
    );
    expect(cls?.codexId).toBe("category/parameter2");
  });

  test("returns undefined for a class the library does not define", () => {
    expect(resolveImported("undefined-parameter", "parameterClasses")).toBe(
      undefined,
    );
  });

  test("local and imported classes resolve identically apart from member ids", () => {
    const imported = lookupParameterClass(
      resolveImported("mode", "parameterClasses")!,
      "en-US",
    )!;
    const local = lookupParameterClass(
      resolveLocal("mode", "parameterClasses")!,
      "en-US",
    )!;

    expect(stripIds(local)).toStrictEqual(stripIds(imported));
  });

  test("class members are referenced by codexId when imported and by entity id when local", () => {
    const imported = lookupParameterClass(
      resolveImported("mode", "parameterClasses")!,
      "en-US",
    )!;
    const local = lookupParameterClass(
      resolveLocal("mode", "parameterClasses")!,
      "en-US",
    )!;

    expect(imported.choices.map((c) => c.id)).toEqual(["auto", "manual"]);
    expect(local.choices.map((c) => c.id)).toEqual(
      local.choices.map((c) => editorChoiceId(c.codexId)),
    );
  });
});

describe("resource class lookup", () => {
  test("local and imported classes resolve identically", () => {
    const imported = lookupResourceClass(
      resolveImported("icon", "resourceClasses")!,
      "en-US",
    );
    const local = lookupResourceClass(
      resolveLocal("icon", "resourceClasses")!,
      "en-US",
    );

    expect(local).toStrictEqual(imported);
    expect(imported?.name.value).toBe("Icon");
    expect(imported?.mediaType).toEqual(["image/png"]);
  });
});

describe("command class lookup", () => {
  test("local and imported classes resolve identically apart from member ids", () => {
    const imported = lookupCommandClass(
      resolveImported("reset", "commandClasses")!,
      "en-US",
    )!;
    const local = lookupCommandClass(
      resolveLocal("reset", "commandClasses")!,
      "en-US",
    )!;

    expect(stripIds(local)).toStrictEqual(stripIds(imported));
    expect(imported.arguments[CodexId("target")].name.value).toBe("Target");
    expect(imported.arguments[CodexId("target")].choices[0].name.value).toBe(
      "All",
    );
    expect(imported.returnValues[CodexId("status")].name.value).toBe("Status");
  });

  test("imported members are referenced by codexId", () => {
    const imported = lookupCommandClass(
      resolveImported("reset", "commandClasses")!,
      "en-US",
    )!;

    expect(imported.arguments[CodexId("target")].id).toBe("target");
    expect(imported.returnValues[CodexId("status")].id).toBe("status");
  });
});

// The stored id of a class member is the one thing that legitimately differs
// between a local and an imported class, so comparisons drop it.
function stripIds<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (key, val) => (key === "id" ? undefined : val)),
  ) as T;
}

function editorChoiceId(codexId: CodexId): EntityId {
  const entry = Object.entries(editor.enumChoices).find(
    ([, choice]) =>
      choice.codexId === codexId && choice.parent.type === "paramClass",
  );
  if (!entry) {
    throw new Error(`No local enum choice with codexId ${codexId}`);
  }
  return EntityId(entry[0]);
}

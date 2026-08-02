import { describe, test, expect, beforeEach } from "vitest";
import {
  CodexId,
  EntityId,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { getCurrentEditor, updateCurrentEditor } from "./state";
import { useAppPersistentStore } from "app/store";
import { buildExportKeys } from "./exportKeys";

function document() {
  const editor = getCurrentEditor(useAppPersistentStore.getState());
  if (!editor) {
    throw new Error("no device class document is open");
  }
  return editor;
}

function nameOf(key: LocalizationKey | undefined): string | undefined {
  return buildExportKeys(document()).of(key);
}

// Adds a string with no exportKey, as a string created in the app has.
function addString(value: string): LocalizationKey {
  const key = LocalizationKey(`internal-${value}`);
  updateCurrentEditor((editor) => {
    editor.localizations[key] = {
      strings: LocalizationDbSchema.parse({ "en-US": value }),
    };
  });
  return key;
}

describe("export keys", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
  });

  describe("derives a readable name from what refers to the string", () => {
    test("for the device class description", () => {
      expect(nameOf(document().basicData.localized.description)).toBe(
        "devClass_description",
      );
    });

    test("for a parameter class", () => {
      const key = addString("Intensity");
      const classId = EntityId("class-1");
      updateCurrentEditor((editor) => {
        editor.parameterClasses[classId] = {
          codexId: CodexId("intensity"),
          dataType: "number",
          localized: { name: key },
        };
      });

      expect(nameOf(key)).toBe("paramClass_intensity_name");
    });

    test("for a parameter", () => {
      const key = addString("Dimmer");
      updateCurrentEditor((editor) => {
        editor.parameters[EntityId("param-1")] = {
          codexId: CodexId("dimmer"),
          class: { type: "local", id: EntityId("class-1") },
          access: ["readActual"],
          lifetime: "persistent",
          localized: { friendlyName: key },
        };
      });

      expect(nameOf(key)).toBe("param_dimmer");
    });

    test("for an enum choice, through its parent", () => {
      const key = addString("Open");
      const classId = EntityId("class-1");
      updateCurrentEditor((editor) => {
        editor.parameterClasses[classId] = {
          codexId: CodexId("shutter"),
          dataType: "enum",
          localized: { name: LocalizationKey("shutter-name") },
        };
        editor.localizations[LocalizationKey("shutter-name")] = {
          strings: LocalizationDbSchema.parse({ "en-US": "Shutter" }),
        };
        editor.enumChoices[EntityId("choice-1")] = {
          parent: { type: "paramClass", id: classId },
          codexId: CodexId("open"),
          index: 0,
          localized: { name: key },
        };
      });

      expect(nameOf(key)).toBe("paramClass_shutter_enumChoice_open_name");
    });
  });

  test("follows a renamed codex id, because the name is built at export time", () => {
    const key = addString("Dimmer");
    const paramId = EntityId("param-1");
    updateCurrentEditor((editor) => {
      editor.parameters[paramId] = {
        codexId: CodexId("dimmer"),
        class: { type: "local", id: EntityId("class-1") },
        access: ["readActual"],
        lifetime: "persistent",
        localized: { friendlyName: key },
      };
    });

    expect(nameOf(key)).toBe("param_dimmer");

    updateCurrentEditor((editor) => {
      editor.parameters[paramId].codexId = CodexId("brightness");
    });

    expect(nameOf(key)).toBe("param_brightness");
  });

  test("prefers the string's own exportKey over a derived name", () => {
    const key = addString("Dimmer");
    updateCurrentEditor((editor) => {
      editor.parameters[EntityId("param-1")] = {
        codexId: CodexId("dimmer"),
        class: { type: "local", id: EntityId("class-1") },
        access: ["readActual"],
        lifetime: "persistent",
        localized: { friendlyName: key },
      };
      editor.localizations[key].exportKey = "vendor.dimmer.label";
    });

    expect(nameOf(key)).toBe("vendor.dimmer.label");
  });

  test("gives two strings that derive the same name distinct ones", () => {
    const first = addString("One");
    const second = addString("Two");
    updateCurrentEditor((editor) => {
      editor.parameters[EntityId("param-1")] = {
        codexId: CodexId("dimmer"),
        class: { type: "local", id: EntityId("class-1") },
        access: ["readActual"],
        lifetime: "persistent",
        localized: { friendlyName: first },
      };
      editor.parameters[EntityId("param-2")] = {
        codexId: CodexId("dimmer"),
        class: { type: "local", id: EntityId("class-1") },
        access: ["readActual"],
        lifetime: "persistent",
        localized: { friendlyName: second },
      };
    });

    const keys = buildExportKeys(document());
    expect(keys.of(first)).not.toBe(keys.of(second));
  });

  test("falls back to the internal key when the parent cannot be resolved", () => {
    const key = addString("Open");
    updateCurrentEditor((editor) => {
      editor.enumChoices[EntityId("choice-1")] = {
        parent: { type: "paramClass", id: EntityId("gone") },
        codexId: CodexId("open"),
        index: 0,
        localized: { name: key },
      };
    });

    expect(nameOf(key)).toBe(key);
  });

  test("names a string nothing refers to after its own key", () => {
    const key = addString("Orphan");

    expect(nameOf(key)).toBe(key);
  });

  test("is stable across exports of the same document", () => {
    const key = addString("Dimmer");
    updateCurrentEditor((editor) => {
      editor.parameters[EntityId("param-1")] = {
        codexId: CodexId("dimmer"),
        class: { type: "local", id: EntityId("class-1") },
        access: ["readActual"],
        lifetime: "persistent",
        localized: { friendlyName: key },
      };
    });

    expect(nameOf(key)).toBe(nameOf(key));
  });
});

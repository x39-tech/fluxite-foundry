import { describe, expect, test } from "vitest";
import type { DeviceClass } from "@cpwg-community/delver";
import {
  AppPersistentState,
  DeviceClassDocument,
  EntityId,
  LocalizationKey,
  migrateState,
} from "app/persistentState";
import { SNAPSHOT_HISTORY } from "app/persistentState/testdata/snapshotHistory";
import {
  buildLocalizationIndex,
  checkIntegrity,
} from "features/localizations/registry";
import { localize } from "features/localizations/localize";
import { LocalizationReference } from "features/localizations/types";
import { DEVICE_CLASS_LOCALIZATIONS } from "./localizationRegistry";
import { getImportedDeviceClassEditor } from "./import";

function index(editor: DeviceClassDocument) {
  return buildLocalizationIndex(editor, DEVICE_CLASS_LOCALIZATIONS);
}

// Asserts that a field holds a key, that the index attributes that key to
// exactly the given places, and that it reads as the expected string.
function expectField(
  editor: DeviceClassDocument,
  key: LocalizationKey | undefined,
  value: string,
  references: LocalizationReference[],
) {
  expect(key).toBeDefined();
  expect(index(editor)[key!]).toEqual(references);
  expect(localize(editor.localizations, key!, "en-US").value).toBe(value);
}

describe("a device class document", () => {
  test("has consistent localizations when freshly imported", () => {
    expect(
      checkIntegrity(importCommandDeviceClass(), DEVICE_CLASS_LOCALIZATIONS),
    ).toEqual([]);
  });

  describe.each(SNAPSHOT_HISTORY)("$fileName", (entry) => {
    test("has consistent localizations in every document it holds", () => {
      const state = migrateState(
        entry.snapshot.state,
        entry.version,
      ) as AppPersistentState;

      const editors = Object.values(state.documents);
      expect(editors.length).toBeGreaterThan(0);

      for (const editor of editors) {
        expect(checkIntegrity(editor, DEVICE_CLASS_LOCALIZATIONS)).toEqual([]);
      }
    });
  });
});

describe("the derived index", () => {
  test("attributes the device class description to the document itself", () => {
    const editor = importCommandDeviceClass();

    expectField(editor, editor.basicData.localized.description, "A device", [
      { table: "basicData", entityId: undefined, field: "description" },
    ]);
  });

  // The import path was refactored after `Localization.items` was written, and
  // for a while it attached an argument's references to its command class's
  // strings. Nothing read the field, so nothing noticed.
  test("attributes a command class member's strings to the member", () => {
    const editor = importCommandDeviceClass();
    const argumentId = entityWithCodexId(editor.commandClassArguments, "mode");
    const argument = editor.commandClassArguments[argumentId];
    const returnId = entityWithCodexId(
      editor.commandClassReturnValues,
      "status",
    );

    expectField(editor, argument.localized.name, "Mode", [
      { table: "commandClassArguments", entityId: argumentId, field: "name" },
    ]);
    expectField(editor, argument.localized.description, "Which mode", [
      {
        table: "commandClassArguments",
        entityId: argumentId,
        field: "description",
      },
    ]);
    expectField(
      editor,
      editor.commandClassReturnValues[returnId].localized.name,
      "Status",
      [
        {
          table: "commandClassReturnValues",
          entityId: returnId,
          field: "name",
        },
      ],
    );
  });

  test("attributes a command class's strings to the class alone", () => {
    const editor = importCommandDeviceClass();
    const commandClassId = entityWithCodexId(editor.commandClasses, "set.mode");

    expectField(
      editor,
      editor.commandClasses[commandClassId].localized.name,
      "Set mode",
      [{ table: "commandClasses", entityId: commandClassId, field: "name" }],
    );
  });

  test("attributes an enum choice's name to the choice, not its parent", () => {
    const editor = importCommandDeviceClass();
    const choiceId = entityWithCodexId(editor.enumChoices, "fast");

    expectField(editor, editor.enumChoices[choiceId].localized.name, "Fast", [
      { table: "enumChoices", entityId: choiceId, field: "name" },
    ]);
  });
});

function entityWithCodexId<T extends { codexId: string }>(
  table: Record<EntityId, T>,
  codexId: string,
): EntityId {
  const entry = Object.entries(table).find(
    ([, entity]) => entity.codexId === codexId,
  );
  if (!entry) {
    throw new Error(`No entity with codexId "${codexId}"`);
  }
  return EntityId(entry[0]);
}

// A device class with a command class carrying an argument, a return value and
// enum choices under each, plus a command instance with its own choices. Every
// localization key it uses has a string.
function importCommandDeviceClass(): DeviceClassDocument {
  const deviceClass: DeviceClass = {
    libraries: {},
    "@description": "device.description",
    publishDate: "2024-01-01T00:00:00.000Z",
    author: "Test Author",
    info: {
      manufacturer: { name: "Test Manufacturer" },
      model: {
        name: "Test Model",
        category: "lighting",
        subcategory: "moving-profile",
      },
    },
    history: { "1.0.0": "Initial release" },
    deviceLibrary: {
      commandClasses: {
        "set.mode": {
          "@name": "cmdClass.name",
          "@description": "cmdClass.description",
          arguments: {
            mode: {
              "@name": "arg.mode.name",
              "@description": "arg.mode.description",
              dataType: "enum",
              required: true,
              choices: [
                { id: "fast", "@name": "arg.mode.fast.name" },
                { id: "slow", "@name": "arg.mode.slow.name" },
              ],
            },
          },
          returns: {
            status: {
              "@name": "ret.status.name",
              dataType: "enum",
              required: true,
              choices: [{ id: "ok", "@name": "ret.status.ok.name" }],
            },
          },
        },
      },
    },
    commands: {
      "set-mode": {
        class: "set.mode",
        completionNotification: false,
        "@friendlyName": "command.friendlyName",
        argumentChoices: {
          mode: { additional: [{ id: "custom", "@name": "cmd.custom.name" }] },
        },
      },
    },
    localizations: {
      "en-US": {
        strings: {
          "device.description": "A device",
          "cmdClass.name": "Set mode",
          "cmdClass.description": "Sets the mode",
          "arg.mode.name": "Mode",
          "arg.mode.description": "Which mode",
          "arg.mode.fast.name": "Fast",
          "arg.mode.slow.name": "Slow",
          "ret.status.name": "Status",
          "ret.status.ok.name": "OK",
          "command.friendlyName": "Set the mode",
          "cmd.custom.name": "Custom",
        },
      },
    },
  };

  return getImportedDeviceClassEditor(
    { type: "org", id: "test-org" },
    "test-device-class",
    "1.0.0",
    deviceClass,
    "en-US",
  );
}

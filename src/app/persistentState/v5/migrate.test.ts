import { describe, test, expect } from "vitest";
import { treeifyError } from "zod";
import { migrateV4toV5 } from "./migrate";
import * as V4 from "../v4/state";
import * as V5 from "./state";

// Builds a minimal V4 editor.
function createV4Editor(
  overrides: {
    [K in keyof V4.DeviceClassEditorState]?: unknown;
  } = {},
): V4.DeviceClassEditorState {
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
        description: "devClass_description" as V4.LocalizationKey,
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
    localizations: {
      devClass_description: {
        strings: { "en-US": "A device" },
        items: [{ itemType: "devClassDesc" }],
      },
    },
    windowLayout: '{"type":"row"}',
    ...overrides,
  } as V4.DeviceClassEditorState;
}

function createV4State(
  editors: Record<string, V4.DeviceClassEditorState>,
  openEditors?: Partial<V4.OpenEditors>,
  locale = "en-US",
): V4.AppPersistentState {
  return {
    appSettings: {
      theme: "dark",
      orgId: { type: "user", id: "test-user-id" },
      locale,
    },
    openEditors: {
      editors: Object.keys(editors).map((id) => ({
        type: "deviceClass",
        id,
      })),
      selectedEditor: 0,
      ...openEditors,
    },
    deviceClassEditors: editors,
  } as V4.AppPersistentState;
}

function expectValid(state: V5.AppPersistentState) {
  const result = V5.AppStateSchema.safeParse(state);
  expect(
    result.success ? "valid" : JSON.stringify(treeifyError(result.error)),
  ).toBe("valid");
}

describe("migrateV4toV5", () => {
  describe("the documents map", () => {
    test("moves each device class editor into documents under the same id", () => {
      const migrated = migrateV4toV5(
        createV4State({ "doc-1": createV4Editor(), "doc-2": createV4Editor() }),
      );

      expect(Object.keys(migrated.documents)).toEqual(["doc-1", "doc-2"]);
      expectValid(migrated);
    });

    test("stamps the document type onto each one", () => {
      const migrated = migrateV4toV5(
        createV4State({ "doc-1": createV4Editor() }),
      );

      expect(migrated.documents["doc-1" as V5.EntityId].type).toBe(
        "deviceClass",
      );
    });

    test("preserves the document's content", () => {
      const migrated = migrateV4toV5(
        createV4State({
          "doc-1": createV4Editor({
            deviceClassId: "kept",
            libraries: { a: "1" },
          }),
        }),
      );

      const document = migrated.documents["doc-1" as V5.EntityId];
      expect(document.deviceClassId).toBe("kept");
      expect(document.libraries).toEqual({ a: "1" });
    });

    test("seeds sourceLocale from the app locale", () => {
      const migrated = migrateV4toV5(
        createV4State({ "doc-1": createV4Editor() }, undefined, "de-DE"),
      );

      expect(migrated.documents["doc-1" as V5.EntityId].sourceLocale).toBe(
        "de-DE",
      );
    });
  });

  describe("localizations", () => {
    test("drops the stored back-references but keeps the strings", () => {
      const migrated = migrateV4toV5(
        createV4State({ "doc-1": createV4Editor() }),
      );

      const localizations =
        migrated.documents["doc-1" as V5.EntityId].localizations;
      const localization =
        localizations["devClass_description" as V5.LocalizationKey];

      expect(localization.strings).toEqual({ "en-US": "A device" });
      expect("items" in localization).toBe(false);
    });

    test("leaves exportKey unset, so export derives a name", () => {
      const migrated = migrateV4toV5(
        createV4State({ "doc-1": createV4Editor() }),
      );

      expect(
        migrated.documents["doc-1" as V5.EntityId].localizations[
          "devClass_description" as V5.LocalizationKey
        ].exportKey,
      ).toBeUndefined();
    });
  });

  describe("the session", () => {
    test("lists the open documents in the order their tabs were in", () => {
      const migrated = migrateV4toV5(
        createV4State({ "doc-1": createV4Editor(), "doc-2": createV4Editor() }),
      );

      expect(migrated.session.openDocuments).toEqual(["doc-1", "doc-2"]);
    });

    test("turns the selected index into the selected document's id", () => {
      const migrated = migrateV4toV5(
        createV4State(
          { "doc-1": createV4Editor(), "doc-2": createV4Editor() },
          { selectedEditor: 1 },
        ),
      );

      expect(migrated.session.selectedDocumentId).toBe("doc-2");
    });

    test("selects nothing when the index pointed past the end", () => {
      const migrated = migrateV4toV5(
        createV4State({ "doc-1": createV4Editor() }, { selectedEditor: -1 }),
      );

      expect(migrated.session.selectedDocumentId).toBeUndefined();
      expectValid(migrated);
    });

    test("moves each document's window layout out of the document", () => {
      const migrated = migrateV4toV5(
        createV4State({
          "doc-1": createV4Editor({ windowLayout: '{"type":"row"}' }),
        }),
      );

      expect(migrated.session.layouts).toEqual({
        "doc-1": '{"type":"row"}',
      });
      expect("windowLayout" in migrated.documents["doc-1" as V5.EntityId]).toBe(
        false,
      );
    });

    test("drops an open-editors entry naming a document that is not there", () => {
      const state = createV4State({ "doc-1": createV4Editor() });
      state.openEditors.editors.push({
        type: "deviceClass",
        id: "missing" as V4.EntityId,
      });

      const migrated = migrateV4toV5(state);

      expect(migrated.session.openDocuments).toEqual(["doc-1"]);
      expectValid(migrated);
    });
  });

  test("preserves app settings", () => {
    const migrated = migrateV4toV5(
      createV4State({ "doc-1": createV4Editor() }),
    );

    expect(migrated.appSettings).toEqual({
      theme: "dark",
      orgId: { type: "user", id: "test-user-id" },
      locale: "en-US",
    });
  });

  test("produces a valid empty state when nothing is open", () => {
    const migrated = migrateV4toV5(createV4State({}, { selectedEditor: -1 }));

    expect(migrated.documents).toEqual({});
    expect(migrated.session.openDocuments).toEqual([]);
    expectValid(migrated);
  });
});

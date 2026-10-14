import { describe, test, expect } from "vitest";
import { treeifyError } from "zod";
import { nanoid } from "nanoid";
import { migrateV6toV7 } from "./migrate";
import * as V6 from "../v6/state";
import * as V7 from "./state";

function createV6State(): V6.AppPersistentState {
  return {
    appSettings: {
      theme: "dark",
      orgId: { type: "user", id: "test-user-id" },
      authoringLocale: "en-US",
      uiLocale: "system",
    },
    session: {
      openDocuments: [],
      selectedDocumentId: undefined,
      layouts: {},
    },
    documents: {},
  } as V6.AppPersistentState;
}

function createV6Document(): V6.DeviceClassDocument {
  const devClassDesc = nanoid();
  return {
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
      localized: {
        description: devClassDesc as V6.LocalizationKey,
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
      [devClassDesc]: {
        strings: V6.LocalizationDbSchema.parse({ "en-US": "A device" }),
      },
    },
  } as V6.DeviceClassDocument;
}

function stateWithADocument(): V6.AppPersistentState {
  const state = createV6State();
  state.documents["doc1" as V6.EntityId] = createV6Document();
  return state;
}

function migratedDocument(
  state: V6.AppPersistentState = stateWithADocument(),
): V7.DeviceClassDocument {
  const result = migrateV6toV7(state);
  const document = result.documents["doc1" as V7.EntityId];
  if (document.type !== "deviceClass") {
    throw new Error("expected a device class document");
  }
  return document;
}

describe("migrateV6toV7", () => {
  test("adds an empty structure passthrough table", () => {
    expect(migratedDocument().structures).toEqual({});
  });

  test("adds the empty emitter tables", () => {
    const document = migratedDocument();

    expect(document.emitterGroupEditors).toEqual([]);
    expect(document.emitterGroups).toEqual({});
    expect(document.emitters).toEqual({});
    expect(document.emitterControlGroups).toEqual({});
  });

  test("leaves the document without an emitters structure", () => {
    expect(migratedDocument().emittersStructure).toBeUndefined();
  });

  test("preserves the existing document fields", () => {
    const state = stateWithADocument();
    const original = state.documents["doc1" as V6.EntityId];

    const document = migratedDocument(state);

    expect(document.deviceClassId).toBe("test-device-class");
    expect(document.basicData).toEqual(original.basicData);
    expect(document.localizations).toEqual(original.localizations);
  });

  test("preserves settings and session untouched", () => {
    const state = stateWithADocument();
    state.session.layouts = {
      ["doc1" as V6.EntityId]: '{"type":"row"}',
    };

    const result = migrateV6toV7(state);

    expect(result.appSettings).toEqual(state.appSettings);
    expect(result.session).toEqual(state.session);
  });

  test("produces a state that validates against the V7 schema", () => {
    const result = migrateV6toV7(stateWithADocument());

    const parsed = V7.AppStateSchema.safeParse(result);

    expect(
      parsed.success ? undefined : treeifyError(parsed.error),
    ).toBeUndefined();
  });
});

import { describe, test, expect } from "vitest";
import { treeifyError } from "zod";
import { nanoid } from "nanoid";
import { migrateV7toV8 } from "./migrate";
import * as V7 from "../v7/state";
import * as V8 from "./state";

function createV7State(): V7.AppPersistentState {
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
  } as V7.AppPersistentState;
}

function createV7Document(): V7.DeviceClassDocument {
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
        description: devClassDesc as V7.LocalizationKey,
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
    dmxSerializers: {},
    localizations: {
      [devClassDesc]: {
        strings: V7.LocalizationDbSchema.parse({ "en-US": "A device" }),
      },
    },
  } as V7.DeviceClassDocument;
}

function stateWithADocument(): V7.AppPersistentState {
  const state = createV7State();
  state.documents["doc1" as V7.EntityId] = createV7Document();
  return state;
}

function migratedDocument(
  state: V7.AppPersistentState = stateWithADocument(),
): V8.DeviceClassDocument {
  const result = migrateV7toV8(state);
  const document = result.documents["doc1" as V8.EntityId];
  if (document.type !== "deviceClass") {
    throw new Error("expected a device class document");
  }
  return document;
}

describe("migrateV7toV8", () => {
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
    const original = state.documents["doc1" as V7.EntityId];

    const document = migratedDocument(state);

    expect(document.deviceClassId).toBe("test-device-class");
    expect(document.basicData).toEqual(original.basicData);
    expect(document.localizations).toEqual(original.localizations);
  });

  test("preserves settings and session untouched", () => {
    const state = stateWithADocument();
    state.session.layouts = {
      ["doc1" as V7.EntityId]: '{"type":"row"}',
    };

    const result = migrateV7toV8(state);

    expect(result.appSettings).toEqual(state.appSettings);
    expect(result.session).toEqual(state.session);
  });

  test("produces a state that validates against the V8 schema", () => {
    const result = migrateV7toV8(stateWithADocument());

    const parsed = V8.AppStateSchema.safeParse(result);

    expect(
      parsed.success ? undefined : treeifyError(parsed.error),
    ).toBeUndefined();
  });
});

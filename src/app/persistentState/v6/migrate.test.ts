import { describe, test, expect } from "vitest";
import { treeifyError } from "zod";
import { nanoid } from "nanoid";
import { migrateV5toV6 } from "./migrate";
import * as V5 from "../v5/state";
import * as V6 from "./state";

function createV5State(locale = "en-US"): V5.AppPersistentState {
  return {
    appSettings: {
      theme: "dark",
      orgId: { type: "user", id: "test-user-id" },
      locale,
    },
    session: {
      openDocuments: [],
      selectedDocumentId: undefined,
      layouts: {},
    },
    documents: {},
  } as V5.AppPersistentState;
}

function createV5Document(): V5.DeviceClassDocument {
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
        description: devClassDesc as V5.LocalizationKey,
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
        strings: V5.LocalizationDbSchema.parse({ "en-US": "A device" }),
      },
    },
  } as V5.DeviceClassDocument;
}

describe("migrateV5toV6", () => {
  test("carries the old locale over as the authoring locale", () => {
    const result = migrateV5toV6(createV5State("de-DE"));

    expect(result.appSettings.authoringLocale).toBe("de-DE");
  });

  test("leaves the interface language following the browser", () => {
    const result = migrateV5toV6(createV5State());

    expect(result.appSettings.uiLocale).toBe("system");
  });

  test("drops the old field", () => {
    const result = migrateV5toV6(createV5State());

    expect(result.appSettings).not.toHaveProperty("locale");
  });

  test("preserves the other settings", () => {
    const state = createV5State();

    const result = migrateV5toV6(state);

    expect(result.appSettings.theme).toBe(state.appSettings.theme);
    expect(result.appSettings.orgId).toEqual(state.appSettings.orgId);
  });

  test("preserves documents and session untouched", () => {
    const state = createV5State();
    state.session.layouts = {
      ["doc1" as V5.EntityId]: '{"type":"row"}',
    };
    state.documents["doc1" as V5.EntityId] = createV5Document();

    const result = migrateV5toV6(state);

    expect(result.session).toEqual(state.session);
    expect(result.documents).toEqual(state.documents);
  });

  test("produces a state that validates against the V6 schema", () => {
    const result = migrateV5toV6(createV5State());

    const parsed = V6.AppStateSchema.safeParse(result);

    expect(
      parsed.success ? undefined : treeifyError(parsed.error),
    ).toBeUndefined();
  });
});

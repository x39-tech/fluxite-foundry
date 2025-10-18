import { getByText, screen } from "@testing-library/react";
import { useAppPersistentStore, useAppRuntimeStore } from "app/store";
import {
  EntityId,
  getDefaultState,
  LocalizationKey,
} from "app/persistentState";
import { loadDefaultLibraries } from "codex/codexDatabase";

/**
 * Resets the entire persistent store to its default state.
 * Use this in beforeEach() to ensure test isolation.
 */
export function resetAppPersistentStore() {
  useAppPersistentStore.setState(getDefaultState(), true);
}

/**
 * Resets the entire runtime store to its default state.
 * Use this in beforeEach() to ensure test isolation.
 */
export function resetAppRuntimeStore() {
  useAppRuntimeStore.setState(
    {
      dmxController: {
        state: "not-created",
      },
      udrDatabase: loadDefaultLibraries(),
      systemDarkModePreference: false,
    },
    true,
  );
}

/**
 * Resets both persistent and runtime stores.
 * Use this in beforeEach() for complete test isolation.
 */
export function resetAllStores() {
  resetAppPersistentStore();
  resetAppRuntimeStore();
}

/**
 * Creates a minimal empty device class editor for testing.
 * This avoids the default parameters that come with createDeviceClassEditor().
 */
export function createEmptyDeviceClassEditor() {
  const state = useAppPersistentStore.getState();
  const editorId = "test-editor-id";

  state.deviceClassEditors[editorId] = {
    orgId: { type: "org", id: "test-org" },
    deviceClassId: "test-device-class",
    deviceClassVersion: "1.0.0",
    basicData: {
      publishDate: new Date().toISOString(),
      author: "Test Author",
      history: {},
      manufacturerName: "Test Manufacturer",
      manufacturerUrl: "",
      manufacturerEstaId: undefined,
      modelName: "Test Model",
      modelCategory: "lighting",
      modelSubcategory: "fixed-profile",
      compatibleFirmwareVersions: undefined,
      localized: {
        description: LocalizationKey("test description"),
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
    windowLayout: "",
  };

  state.openEditors.editors.push({
    type: "deviceClass",
    id: EntityId(editorId),
  });
  state.openEditors.selectedEditor = state.openEditors.editors.length - 1;

  useAppPersistentStore.setState(state, true);
}

export function getEditorTableRow(
  labelText: string,
  element?: HTMLElement,
): HTMLElement {
  const labelElem = (() => {
    if (element) {
      return getByText(element, labelText);
    } else {
      return screen.getByText(labelText);
    }
  })();

  if (!labelElem.parentElement) {
    throw Error(`${labelElem} did not have a parent element`);
  }

  return labelElem.parentElement;
}

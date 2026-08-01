import { getByText, screen } from "@testing-library/react";
import { useAppPersistentStore, useAppRuntimeStore } from "app/store";
import {
  AppPersistentState,
  EntityId,
  getDefaultState,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { loadDefaultLibraries } from "codex/libraryStore";
import { checkIntegrity } from "features/localizations/registry";
import { DEVICE_CLASS_LOCALIZATIONS } from "features/deviceClassEditor/localizationRegistry";

/**
 * Resets the entire persistent store to its default state.
 * Use this in beforeEach() to ensure test isolation.
 */
export function resetAppPersistentStore() {
  watchLocalizationIntegrity();
  useAppPersistentStore.setState(getDefaultState(), true);
}

/**
 * Throws if any open document's localized fields and string table disagree.
 * A mutation that leaves a field pointing at a string that is not there, a
 * string with no value at all, or a required field with no string, is a bug in
 * the mutation.
 */
export function assertLocalizationIntegrity(state: AppPersistentState) {
  for (const [id, editor] of Object.entries(state.deviceClassEditors)) {
    const problems = checkIntegrity(editor, DEVICE_CLASS_LOCALIZATIONS);
    if (problems.length > 0) {
      throw new Error(
        `Device class editor ${id} has inconsistent localizations:\n` +
          problems.map((problem) => `  ${problem.message}`).join("\n"),
      );
    }
  }
}

let integrityWatched = false;

// Checks integrity after every change to the persistent store, so that a state
// test does not have to assert it by hand to be told which mutation broke it.
function watchLocalizationIntegrity() {
  if (integrityWatched) {
    return;
  }

  integrityWatched = true;
  useAppPersistentStore.subscribe(assertLocalizationIntegrity);
}

/**
 * Resets the entire runtime store to its default state.
 * Use this in beforeEach() to ensure test isolation.
 */
export function resetAppRuntimeStore() {
  useAppRuntimeStore.setState(
    {
      dmxControllers: {},
      libraries: loadDefaultLibraries(),
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
  const editorId = EntityId("test-editor-id");
  const descriptionKey = LocalizationKey("test description");

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
        description: descriptionKey,
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
      [descriptionKey]: {
        strings: LocalizationDbSchema.parse({ "en-US": "Test description" }),
        items: [{ itemType: "devClassDesc" }],
      },
    },
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

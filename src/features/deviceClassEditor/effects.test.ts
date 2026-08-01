import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { CodexId, EntityId } from "app/persistentState";
import {
  updateAppPersistentState,
  useAppPersistentStore,
  useAppRuntimeStore,
} from "app/store";
import { DmxController } from "app/runtimeState";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { deleteEditor, setSelectedEditor } from "features/topNavBar/state";
import { updateCurrentEditor, setWindowLayout } from "./state";
import { initDeviceClassEditorEffects } from "./effects";

const FIRST_EDITOR = EntityId("test-editor-id");
const SECOND_EDITOR = EntityId("second-editor-id");

describe("DMX driver effect", () => {
  let stopEffects: () => void = () => {};

  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    addDmxSerializer(FIRST_EDITOR);
  });

  afterEach(() => {
    stopEffects();
  });

  test("builds a driver for a document that was already open", () => {
    stopEffects = initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)?.state).toBe("available");
  });

  test("leaves a document with no DMX serializer without a driver", () => {
    updateCurrentEditor((editor) => {
      editor.dmxSerializer = undefined;
    });

    stopEffects = initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)).toBeUndefined();
  });

  test("leaves a document with nothing mapped yet without a driver", () => {
    updateCurrentEditor((editor) => {
      editor.dmxSerializer = {
        chunks: {},
        mappingGroups: {},
        conditions: {},
      };
    });

    stopEffects = initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)).toBeUndefined();
  });

  test("rebuilds the driver when the document changes", () => {
    stopEffects = initDeviceClassEditorEffects();
    const before = controllerFor(FIRST_EDITOR);

    addParameter();

    expect(controllerFor(FIRST_EDITOR)).not.toBe(before);
  });

  test("does not rebuild the driver when the window layout changes", () => {
    stopEffects = initDeviceClassEditorEffects();
    const before = controllerFor(FIRST_EDITOR);

    setWindowLayout({ layout: { type: "row", children: [] } });

    expect(windowLayoutOf(FIRST_EDITOR)).not.toBe("");
    expect(controllerFor(FIRST_EDITOR)).toBe(before);
  });

  test("does not rebuild any driver when the selected document changes", () => {
    openSecondEditor();
    stopEffects = initDeviceClassEditorEffects();
    const first = controllerFor(FIRST_EDITOR);
    const second = controllerFor(SECOND_EDITOR);

    setSelectedEditor(0);

    expect(controllerFor(FIRST_EDITOR)).toBe(first);
    expect(controllerFor(SECOND_EDITOR)).toBe(second);
  });

  test("gives each open document its own driver", () => {
    openSecondEditor();
    stopEffects = initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)).toBeDefined();
    expect(controllerFor(SECOND_EDITOR)).toBeDefined();
    expect(controllerFor(FIRST_EDITOR)).not.toBe(controllerFor(SECOND_EDITOR));
  });

  test("rebuilds only the driver of the document that changed", () => {
    openSecondEditor();
    stopEffects = initDeviceClassEditorEffects();
    const first = controllerFor(FIRST_EDITOR);
    const second = controllerFor(SECOND_EDITOR);

    // The second editor is the selected one, so this edits that document.
    addParameter();

    expect(controllerFor(SECOND_EDITOR)).not.toBe(second);
    expect(controllerFor(FIRST_EDITOR)).toBe(first);
  });

  test("removes the driver when the document is closed", () => {
    openSecondEditor();
    stopEffects = initDeviceClassEditorEffects();

    deleteEditor(1);

    expect(controllerFor(SECOND_EDITOR)).toBeUndefined();
    expect(controllerFor(FIRST_EDITOR)).toBeDefined();
  });

  test("stops following the state once stopped", () => {
    stopEffects = initDeviceClassEditorEffects();
    const before = controllerFor(FIRST_EDITOR);
    stopEffects();

    addParameter();

    expect(controllerFor(FIRST_EDITOR)).toBe(before);
  });
});

function controllerFor(editorId: EntityId): DmxController | undefined {
  return useAppRuntimeStore.getState().dmxControllers[editorId];
}

function windowLayoutOf(editorId: EntityId): string | undefined {
  return useAppPersistentStore.getState().deviceClassEditors[editorId]
    ?.windowLayout;
}

function addDmxSerializer(editorId: EntityId) {
  updateAppPersistentState((state) => {
    state.deviceClassEditors[editorId].dmxSerializer = {
      chunks: { [EntityId("chunk1")]: { offsets: [0] } },
      mappingGroups: {},
      conditions: {},
    };
  });
}

function addParameter() {
  updateCurrentEditor((editor) => {
    editor.parameters[EntityId("param1")] = {
      codexId: CodexId("param1"),
      class: { type: "local", id: EntityId("class1") },
      access: ["readActual"],
      lifetime: "persistent",
      localized: {},
    };
  });
}

// Opens a second device class document, as a copy of the first, and selects it.
function openSecondEditor() {
  const source =
    useAppPersistentStore.getState().deviceClassEditors[FIRST_EDITOR];

  updateAppPersistentState((state) => {
    state.deviceClassEditors[SECOND_EDITOR] = {
      ...source,
      deviceClassId: "second-device-class",
    };
    state.openEditors.editors.push({
      type: "deviceClass",
      id: SECOND_EDITOR,
    });
    state.openEditors.selectedEditor = state.openEditors.editors.length - 1;
  });
}

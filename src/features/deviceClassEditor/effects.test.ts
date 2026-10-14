import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { CodexId, EntityId } from "app/persistentState";
import {
  updateAppPersistentState,
  useAppPersistentStore,
  useAppRuntimeStore,
} from "app/store";
import { DmxController } from "app/runtimeState";
import { initUndo, undo } from "app/undo";
import {
  createEmptyDeviceClassEditor,
  resetAllStores,
  testUndoLabel,
} from "test/utils";
import { closeDocument, setSelectedDocument } from "features/topNavBar/state";
import { updateCurrentEditor, setWindowLayout } from "./state";
import {
  initDeviceClassEditorEffects,
  stopDeviceClassEditorEffects,
} from "./effects";

const FIRST_EDITOR = EntityId("test-editor-id");
const SECOND_EDITOR = EntityId("second-editor-id");

describe("DMX driver effect", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    addDmxSerializer(FIRST_EDITOR);
  });

  afterEach(() => {
    stopDeviceClassEditorEffects();
  });

  test("builds a driver for a document that was already open", () => {
    initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)?.state).toBe("available");
  });

  test("leaves a document with no DMX serializer without a driver", () => {
    updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
      editor.dmxSerializer = undefined;
    });

    initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)).toBeUndefined();
  });

  test("leaves a document with nothing mapped yet without a driver", () => {
    updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
      editor.dmxSerializer = {
        chunks: {},
        mappingGroups: {},
        conditions: {},
      };
    });

    initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)).toBeUndefined();
  });

  test("rebuilds the driver when the document changes", () => {
    initDeviceClassEditorEffects();
    const before = controllerFor(FIRST_EDITOR);

    addParameter();

    expect(controllerFor(FIRST_EDITOR)).not.toBe(before);
  });

  test("does not rebuild the driver when the window layout changes", () => {
    initDeviceClassEditorEffects();
    const before = controllerFor(FIRST_EDITOR);

    setWindowLayout(FIRST_EDITOR, { layout: { type: "row", children: [] } });

    expect(windowLayoutOf(FIRST_EDITOR)).not.toBe("");
    expect(controllerFor(FIRST_EDITOR)).toBe(before);
  });

  test("does not rebuild any driver when the selected document changes", () => {
    openSecondEditor();
    initDeviceClassEditorEffects();
    const first = controllerFor(FIRST_EDITOR);
    const second = controllerFor(SECOND_EDITOR);

    setSelectedDocument(FIRST_EDITOR);

    expect(controllerFor(FIRST_EDITOR)).toBe(first);
    expect(controllerFor(SECOND_EDITOR)).toBe(second);
  });

  test("gives each open document its own driver", () => {
    openSecondEditor();
    initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)).toBeDefined();
    expect(controllerFor(SECOND_EDITOR)).toBeDefined();
    expect(controllerFor(FIRST_EDITOR)).not.toBe(controllerFor(SECOND_EDITOR));
  });

  test("rebuilds only the driver of the document that changed", () => {
    openSecondEditor();
    initDeviceClassEditorEffects();
    const first = controllerFor(FIRST_EDITOR);
    const second = controllerFor(SECOND_EDITOR);

    // The second editor is the selected one, so this edits that document.
    addParameter();

    expect(controllerFor(SECOND_EDITOR)).not.toBe(second);
    expect(controllerFor(FIRST_EDITOR)).toBe(first);
  });

  test("removes the driver when the document is closed", () => {
    openSecondEditor();
    initDeviceClassEditorEffects();

    closeDocument(SECOND_EDITOR);

    expect(controllerFor(SECOND_EDITOR)).toBeUndefined();
    expect(controllerFor(FIRST_EDITOR)).toBeDefined();
  });

  // An undo is a state change like any other, so the driver follows it without
  // undo having to know that drivers exist.
  test("rebuilds the driver when a change is undone", () => {
    const stopUndo = initUndo();
    initDeviceClassEditorEffects();
    const before = controllerFor(FIRST_EDITOR);

    addParameter();
    const withParameter = controllerFor(FIRST_EDITOR);
    undo(FIRST_EDITOR);

    try {
      expect(withParameter).not.toBe(before);
      expect(controllerFor(FIRST_EDITOR)).not.toBe(withParameter);
      expect(controllerFor(FIRST_EDITOR)?.state).toBe("available");
    } finally {
      stopUndo();
    }
  });

  test("stops following the state once stopped", () => {
    initDeviceClassEditorEffects();
    const before = controllerFor(FIRST_EDITOR);
    stopDeviceClassEditorEffects();

    addParameter();

    expect(controllerFor(FIRST_EDITOR)).toBe(before);
  });
});

function controllerFor(editorId: EntityId): DmxController | undefined {
  return useAppRuntimeStore.getState().dmxControllers[editorId];
}

function windowLayoutOf(editorId: EntityId): string | undefined {
  return useAppPersistentStore.getState().session.layouts[editorId];
}

function addDmxSerializer(editorId: EntityId) {
  updateAppPersistentState((state) => {
    state.documents[editorId].dmxSerializer = {
      chunks: { [EntityId("chunk1")]: { offsets: [0] } },
      mappingGroups: {},
      conditions: {},
    };
  });
}

function addParameter() {
  updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
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
  const source = useAppPersistentStore.getState().documents[FIRST_EDITOR];

  updateAppPersistentState((state) => {
    state.documents[SECOND_EDITOR] = {
      ...source,
      deviceClassId: "second-device-class",
    };
    state.session.openDocuments.push(SECOND_EDITOR);
    state.session.layouts[SECOND_EDITOR] = state.session.layouts[FIRST_EDITOR];
    state.session.selectedDocumentId = SECOND_EDITOR;
  });
}

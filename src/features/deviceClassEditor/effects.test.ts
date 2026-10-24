import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { CodexId, DmxSerializer, EntityId } from "app/persistentState";
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
import { selectControllerDmxSerializer } from "./controller/state";
import { updateCurrentEditor, setWindowLayout } from "./state";
import {
  initDeviceClassEditorEffects,
  stopDeviceClassEditorEffects,
} from "./effects";

const FIRST_EDITOR = EntityId("test-editor-id");
const SECOND_EDITOR = EntityId("second-editor-id");
const SERIALIZER = EntityId("serializer1");
const WIDE_SERIALIZER = EntityId("serializer2");

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
      editor.dmxSerializers = {};
    });

    initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)).toBeUndefined();
  });

  test("leaves a document with nothing mapped yet without a driver", () => {
    updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
      editor.dmxSerializers = {
        [SERIALIZER]: { ...emptyDmxSerializer("dmx") },
      };
    });

    initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)).toBeUndefined();
  });

  test("builds the driver from a serializer under any ID", () => {
    updateAppPersistentState((state) => {
      state.documents[FIRST_EDITOR].dmxSerializers = {
        [SERIALIZER]: {
          ...emptyDmxSerializer("dmx-extended"),
          chunks: { [EntityId("chunk1")]: { offsets: [0] } },
        },
      };
    });

    initDeviceClassEditorEffects();

    expect(controllerFor(FIRST_EDITOR)?.state).toBe("available");
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

  test("builds the driver from the first mode when none is selected", () => {
    addWideDmxSerializer(FIRST_EDITOR);

    initDeviceClassEditorEffects();

    expect(footprintOf(FIRST_EDITOR)).toBe(1);
  });

  test("builds the driver from the mode the controller selected", () => {
    addWideDmxSerializer(FIRST_EDITOR);
    selectControllerDmxSerializer(FIRST_EDITOR, WIDE_SERIALIZER);

    initDeviceClassEditorEffects();

    expect(footprintOf(FIRST_EDITOR)).toBe(4);
  });

  test("rebuilds the driver when the controller selects another mode", () => {
    addWideDmxSerializer(FIRST_EDITOR);
    initDeviceClassEditorEffects();

    selectControllerDmxSerializer(FIRST_EDITOR, WIDE_SERIALIZER);
    expect(footprintOf(FIRST_EDITOR)).toBe(4);

    selectControllerDmxSerializer(FIRST_EDITOR, SERIALIZER);
    expect(footprintOf(FIRST_EDITOR)).toBe(1);
  });

  test("falls back to the first mode when the selected one is deleted", () => {
    addWideDmxSerializer(FIRST_EDITOR);
    selectControllerDmxSerializer(FIRST_EDITOR, WIDE_SERIALIZER);
    initDeviceClassEditorEffects();

    updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
      delete editor.dmxSerializers[WIDE_SERIALIZER];
    });

    expect(footprintOf(FIRST_EDITOR)).toBe(1);
  });

  test("leaves a document without a driver when its selected mode has nothing mapped", () => {
    updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
      editor.dmxSerializers[WIDE_SERIALIZER] = emptyDmxSerializer("empty");
    });
    initDeviceClassEditorEffects();

    selectControllerDmxSerializer(FIRST_EDITOR, WIDE_SERIALIZER);

    expect(controllerFor(FIRST_EDITOR)).toBeUndefined();
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

// How many DMX slots the document's driver outputs.
function footprintOf(editorId: EntityId): number | undefined {
  const controller = controllerFor(editorId);
  return controller?.state === "available"
    ? controller.driver.getDmxValues().length
    : undefined;
}

function windowLayoutOf(editorId: EntityId): string | undefined {
  return useAppPersistentStore.getState().session.layouts[editorId];
}

function emptyDmxSerializer(codexId: string): DmxSerializer {
  return {
    codexId: CodexId(codexId),
    access: ["read"],
    lifetime: "static",
    chunks: {},
    mappingGroups: {},
    conditions: {},
  };
}

function addDmxSerializer(editorId: EntityId) {
  updateAppPersistentState((state) => {
    state.documents[editorId].dmxSerializers = {
      [SERIALIZER]: {
        ...emptyDmxSerializer("dmx"),
        chunks: { [EntityId("chunk1")]: { offsets: [0] } },
      },
    };
  });
}

// Adds a second serializer with a 4-slot footprint
function addWideDmxSerializer(editorId: EntityId) {
  updateAppPersistentState((state) => {
    state.documents[editorId].dmxSerializers[WIDE_SERIALIZER] = {
      ...emptyDmxSerializer("wide"),
      chunks: { [EntityId("chunk1")]: { offsets: [3] } },
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

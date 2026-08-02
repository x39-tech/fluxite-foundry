import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import {
  setWindowLayout,
  updateCurrentEditor,
} from "features/deviceClassEditor/state";
import { CodexId, EntityId } from "./persistentState";
import { closeDocument, setSelectedDocument } from "./documents";
import {
  asOneChange,
  setTheme,
  updateAppPersistentState,
  useAppPersistentStore,
  useAppRuntimeStore,
} from "./store";
import { HistoryEntry } from "./runtimeState";
import { initUndo, MAX_HISTORY_ENTRIES, redo, undo } from "./undo";

const FIRST_EDITOR = EntityId("test-editor-id");
const SECOND_EDITOR = EntityId("second-editor-id");

describe("undo and redo", () => {
  let stopUndo: () => void = () => {};

  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    stopUndo = initUndo();
  });

  afterEach(() => {
    stopUndo();
  });

  test("puts back a change to a document", () => {
    rename("Renamed");

    undo(FIRST_EDITOR);

    expect(modelName(FIRST_EDITOR)).toBe("Test Model");
  });

  test("makes an undone change again", () => {
    rename("Renamed");
    undo(FIRST_EDITOR);

    redo(FIRST_EDITOR);

    expect(modelName(FIRST_EDITOR)).toBe("Renamed");
  });

  test("puts back changes one at a time, newest first", () => {
    rename("Once");
    rename("Twice");

    undo(FIRST_EDITOR);
    expect(modelName(FIRST_EDITOR)).toBe("Once");

    undo(FIRST_EDITOR);
    expect(modelName(FIRST_EDITOR)).toBe("Test Model");
  });

  test("does nothing when there is nothing to undo or redo", () => {
    undo(FIRST_EDITOR);
    redo(FIRST_EDITOR);

    expect(modelName(FIRST_EDITOR)).toBe("Test Model");
    expect(undoStack(FIRST_EDITOR)).toHaveLength(0);
  });

  test("puts back a change that added an entity", () => {
    addParameter();
    expect(parameterCount(FIRST_EDITOR)).toBe(1);

    undo(FIRST_EDITOR);

    expect(parameterCount(FIRST_EDITOR)).toBe(0);
  });

  test("names a change by the label the change was made with", () => {
    rename("Renamed");

    expect(undoStack(FIRST_EDITOR).at(-1)?.label).toBe("Rename Device");
  });

  test("records a group of updates as one change", () => {
    asOneChange("Rename Everything", () => {
      rename("Renamed");
      updateCurrentEditor("Rename Manufacturer", (editor) => {
        editor.basicData.manufacturerName = "Also renamed";
      });
    });

    expect(undoStack(FIRST_EDITOR)).toHaveLength(1);
    expect(undoStack(FIRST_EDITOR).at(-1)?.label).toBe("Rename Everything");

    undo(FIRST_EDITOR);

    expect(modelName(FIRST_EDITOR)).toBe("Test Model");
    expect(manufacturerName(FIRST_EDITOR)).toBe("Test Manufacturer");
  });

  test("forgets what was undone once a new change is made", () => {
    rename("Renamed");
    undo(FIRST_EDITOR);

    rename("Renamed differently");

    expect(redoStack(FIRST_EDITOR)).toHaveLength(0);
    redo(FIRST_EDITOR);
    expect(modelName(FIRST_EDITOR)).toBe("Renamed differently");
  });

  test("does not record an undo as a change of its own", () => {
    rename("Renamed");

    undo(FIRST_EDITOR);

    expect(undoStack(FIRST_EDITOR)).toHaveLength(0);
    expect(redoStack(FIRST_EDITOR)).toHaveLength(1);
  });

  test("remembers only so many changes", () => {
    for (let i = 0; i < MAX_HISTORY_ENTRIES + 10; i++) {
      rename(`Renamed ${i}`);
    }

    expect(undoStack(FIRST_EDITOR)).toHaveLength(MAX_HISTORY_ENTRIES);

    // The oldest changes were dropped, so undoing everything that is left
    // stops short of the original name.
    for (let i = 0; i < MAX_HISTORY_ENTRIES; i++) {
      undo(FIRST_EDITOR);
    }
    expect(modelName(FIRST_EDITOR)).toBe("Renamed 9");
  });

  describe("what is not undoable", () => {
    test("a change to the settings", () => {
      setTheme("dark");

      expect(undoStack(FIRST_EDITOR)).toHaveLength(0);
    });

    test("a change to the session", () => {
      openSecondEditor();
      setSelectedDocument(FIRST_EDITOR);
      setWindowLayout(FIRST_EDITOR, { layout: { type: "row", children: [] } });

      expect(undoStack(FIRST_EDITOR)).toHaveLength(0);
    });

    test("a document arriving", () => {
      openSecondEditor();

      expect(undoStack(SECOND_EDITOR)).toHaveLength(0);
    });

    test("a document closing", () => {
      openSecondEditor();

      closeDocument(SECOND_EDITOR);

      expect(useAppPersistentStore.getState().documents[SECOND_EDITOR]).toBe(
        undefined,
      );
      expect(undoStack(SECOND_EDITOR)).toHaveLength(0);
    });
  });

  describe("keeping documents apart", () => {
    beforeEach(() => {
      openSecondEditor();
    });

    test("records a change against the document it changed", () => {
      setSelectedDocument(SECOND_EDITOR);
      rename("Renamed");

      expect(undoStack(FIRST_EDITOR)).toHaveLength(0);
      expect(undoStack(SECOND_EDITOR)).toHaveLength(1);
    });

    test("leaves other documents alone when one is undone", () => {
      setSelectedDocument(FIRST_EDITOR);
      rename("First renamed");
      setSelectedDocument(SECOND_EDITOR);
      rename("Second renamed");

      undo(SECOND_EDITOR);

      expect(modelName(SECOND_EDITOR)).toBe("Test Model");
      expect(modelName(FIRST_EDITOR)).toBe("First renamed");
    });

    test("forgets a closed document's history", () => {
      setSelectedDocument(SECOND_EDITOR);
      rename("Renamed");

      closeDocument(SECOND_EDITOR);

      expect(useAppRuntimeStore.getState().history[SECOND_EDITOR]).toBe(
        undefined,
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rename(name: string) {
  updateCurrentEditor("Rename Device", (editor) => {
    editor.basicData.modelName = name;
  });
}

function addParameter() {
  updateCurrentEditor("Add Parameter", (editor) => {
    editor.parameters[EntityId("param1")] = {
      codexId: CodexId("param1"),
      class: { type: "local", id: EntityId("class1") },
      access: ["readActual"],
      lifetime: "persistent",
      localized: {},
    };
    editor.parameterEditors.push(EntityId("param1"));
  });
}

function documentOf(id: EntityId) {
  const document = useAppPersistentStore.getState().documents[id];
  if (document?.type !== "deviceClass") {
    throw new Error(`No device class document ${id}`);
  }
  return document;
}

function modelName(id: EntityId): string {
  return documentOf(id).basicData.modelName;
}

function manufacturerName(id: EntityId): string {
  return documentOf(id).basicData.manufacturerName;
}

function parameterCount(id: EntityId): number {
  return Object.keys(documentOf(id).parameters).length;
}

function undoStack(id: EntityId): HistoryEntry[] {
  return useAppRuntimeStore.getState().history[id]?.undo ?? [];
}

function redoStack(id: EntityId): HistoryEntry[] {
  return useAppRuntimeStore.getState().history[id]?.redo ?? [];
}

// Opens a second device class document, as a copy of the first, and selects it.
function openSecondEditor() {
  const source = documentOf(FIRST_EDITOR);

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

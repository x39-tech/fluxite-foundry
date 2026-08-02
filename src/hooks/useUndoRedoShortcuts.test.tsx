import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import { EntityId } from "app/persistentState";
import { useAppPersistentStore } from "app/store";
import { initUndo } from "app/undo";
import { useUndoRedoShortcuts } from "./useUndoRedoShortcuts";

const EDITOR = EntityId("test-editor-id");

describe("undo and redo shortcuts", () => {
  let stopUndo: () => void = () => {};

  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    stopUndo = initUndo();
    rename("Renamed");
    render(<Listening />);
  });

  afterEach(() => {
    stopUndo();
  });

  test("undoes the last change to the current document", async () => {
    await userEvent.keyboard("{Control>}z{/Control}");

    expect(modelName()).toBe("Test Model");
  });

  test("redoes an undone change", async () => {
    await userEvent.keyboard("{Control>}z{/Control}");

    await userEvent.keyboard("{Control>}{Shift>}z{/Shift}{/Control}");

    expect(modelName()).toBe("Renamed");
  });

  test("redoes with the other shortcut Windows applications offer", async () => {
    await userEvent.keyboard("{Control>}z{/Control}");

    await userEvent.keyboard("{Control>}y{/Control}");

    expect(modelName()).toBe("Renamed");
  });

  test("leaves a field being edited to its own undo", async () => {
    await userEvent.click(screen.getByRole("textbox"));

    await userEvent.keyboard("{Control>}z{/Control}");

    expect(modelName()).toBe("Renamed");
  });

  test("ignores the key on its own", async () => {
    await userEvent.keyboard("z");

    expect(modelName()).toBe("Renamed");
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const Listening = () => {
  useUndoRedoShortcuts();
  return <input aria-label="A field" />;
};

function rename(name: string) {
  updateCurrentEditor("Rename Device", (editor) => {
    editor.basicData.modelName = name;
  });
}

function modelName(): string {
  const document = useAppPersistentStore.getState().documents[EDITOR];
  if (document.type !== "deviceClass") {
    throw new Error("Not a device class document");
  }
  return document.basicData.modelName;
}

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import { EntityId } from "app/persistentState";
import { useAppPersistentStore } from "app/store";
import { initUndo } from "app/undo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "components/scn-ui/DropdownMenu";
import { UndoRedoMenuItems } from "./UndoRedoMenuItems";

const EDITOR = EntityId("test-editor-id");

describe("UndoRedoMenuItems", () => {
  let stopUndo: () => void = () => {};

  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    stopUndo = initUndo();
  });

  afterEach(() => {
    stopUndo();
  });

  test("offers nothing to undo or redo in a document that has not changed", async () => {
    renderMenu();
    await openMenu();

    expect(screen.getByRole("menuitem", { name: /Undo/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("menuitem", { name: /Redo/ })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("names the change it would undo", async () => {
    rename("Renamed");

    renderMenu();
    await openMenu();

    expect(
      screen.getByRole("menuitem", { name: /Undo Rename Device/ }),
    ).toBeInTheDocument();
  });

  test("undoes the last change to the document", async () => {
    rename("Renamed");
    renderMenu();
    await openMenu();

    await userEvent.click(screen.getByRole("menuitem", { name: /Undo/ }));

    expect(modelName()).toBe("Test Model");
  });

  test("redoes a change that was undone", async () => {
    rename("Renamed");
    renderMenu();
    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: /Undo/ }));

    await openMenu();
    await userEvent.click(screen.getByRole("menuitem", { name: /Redo/ }));

    expect(modelName()).toBe("Renamed");
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderMenu() {
  render(
    <DropdownMenu>
      <DropdownMenuTrigger>Menu</DropdownMenuTrigger>
      <DropdownMenuContent>
        <UndoRedoMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>,
  );
}

async function openMenu() {
  await userEvent.click(screen.getByText("Menu"));
}

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

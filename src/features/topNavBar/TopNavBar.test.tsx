import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { EntityId } from "app/persistentState";
import { useAppPersistentStore, updateAppRuntimeState } from "app/store";
import { initDocumentFiles } from "app/documentFile";
import { TopNavBar } from "./TopNavBar";

const EDITOR = EntityId("test-editor-id");

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => false }));

describe("TopNavBar", () => {
  let stopTracking: () => void = () => {};

  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    stopTracking = initDocumentFiles();
  });

  afterEach(() => {
    stopTracking();
  });

  describe("the tab of a document", () => {
    test("says nothing about a document that has never been saved", () => {
      render(<TopNavBar />);

      expect(
        screen.queryByLabelText("Unsaved changes"),
      ).not.toBeInTheDocument();
    });

    test("says nothing about a document whose file is up to date", () => {
      documentHasFile({ dirty: false });

      render(<TopNavBar />);

      expect(
        screen.queryByLabelText("Unsaved changes"),
      ).not.toBeInTheDocument();
    });

    test("marks a document whose file is out of date", () => {
      documentHasFile({ dirty: true });

      render(<TopNavBar />);

      expect(screen.getByLabelText("Unsaved changes")).toBeInTheDocument();
    });
  });

  describe("closing a document", () => {
    test("asks before discarding one that has never been saved", async () => {
      render(<TopNavBar />);

      await closeTab();

      expect(screen.getByText(/changes.+lost/)).toBeInTheDocument();
      expect(isOpen(EDITOR)).toBe(true);
    });

    test("asks before leaving a file out of date", async () => {
      documentHasFile({ dirty: true });
      render(<TopNavBar />);

      await closeTab();

      expect(screen.getByText(/changes.+lost/)).toBeInTheDocument();
      expect(isOpen(EDITOR)).toBe(true);
    });

    test("closes a document whose file is up to date without a word", async () => {
      documentHasFile({ dirty: false });
      render(<TopNavBar />);

      await closeTab();

      expect(isOpen(EDITOR)).toBe(false);
    });

    test("closes the document when the user says to discard it", async () => {
      render(<TopNavBar />);
      await closeTab();

      await userEvent.click(
        screen.getByRole("button", { name: "Close Without Saving" }),
      );

      expect(isOpen(EDITOR)).toBe(false);
    });

    test("leaves the document open when the user changes their mind", async () => {
      render(<TopNavBar />);
      await closeTab();

      await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

      expect(isOpen(EDITOR)).toBe(true);
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});

function documentHasFile({ dirty }: { dirty: boolean }) {
  updateAppRuntimeState((state) => {
    state.documentFiles[EDITOR] = { fileName: "saved.ffd", dirty };
  });
}

function isOpen(id: EntityId): boolean {
  return useAppPersistentStore.getState().documents[id] !== undefined;
}

async function closeTab() {
  await userEvent.click(screen.getByRole("button", { name: "Delete Editor" }));
}

import { describe, test, expect, beforeEach, vi } from "vitest";
import { EntityId } from "app/persistentState";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import {
  setTheme,
  subscribeToStatePatches,
  updateAppPersistentState,
  useAppPersistentStore,
} from "./store";

describe("persistent state patches", () => {
  beforeEach(() => {
    resetAllStores();
  });

  test("describes a change made through the funnel", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    setTheme("dark");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener.mock.calls[0][0]).toEqual([
      { op: "replace", path: ["appSettings", "theme"], value: "dark" },
    ]);

    unsubscribe();
  });

  test("describes a change to a document by the document it belongs to", () => {
    createEmptyDeviceClassEditor();

    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    updateCurrentEditor((editor) => {
      editor.basicData.modelName = "Renamed";
    });

    expect(listener.mock.calls[0][0]).toEqual([
      {
        op: "replace",
        path: [
          "documents",
          EntityId("test-editor-id"),
          "basicData",
          "modelName",
        ],
        value: "Renamed",
      },
    ]);

    unsubscribe();
  });

  test("can put a change back with the inverse patches", () => {
    createEmptyDeviceClassEditor();

    let inverse: Parameters<Parameters<typeof subscribeToStatePatches>[0]>[1] =
      [];
    const unsubscribe = subscribeToStatePatches((_patches, inversePatches) => {
      inverse = inversePatches;
    });

    updateCurrentEditor((editor) => {
      editor.basicData.modelName = "Renamed";
    });
    unsubscribe();

    expect(inverse).toEqual([
      {
        op: "replace",
        path: [
          "documents",
          EntityId("test-editor-id"),
          "basicData",
          "modelName",
        ],
        value: "Test Model",
      },
    ]);
  });

  test("says nothing about an update that changed nothing", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    updateAppPersistentState(() => {});

    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
  });

  test("stops describing changes once unsubscribed", () => {
    const listener = vi.fn();
    subscribeToStatePatches(listener)();

    setTheme("dark");

    expect(listener).not.toHaveBeenCalled();
  });

  test("updates the store before listeners run", () => {
    let themeSeenByListener: string | undefined;
    const unsubscribe = subscribeToStatePatches(() => {
      themeSeenByListener = useAppPersistentStore.getState().appSettings.theme;
    });

    setTheme("dark");
    unsubscribe();

    expect(themeSeenByListener).toBe("dark");
  });
});

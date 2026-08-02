import { describe, test, expect, beforeEach, vi } from "vitest";
import { EntityId } from "app/persistentState";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import {
  asOneChange,
  setTheme,
  StateChange,
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
    expect(change(listener).patches).toEqual([
      { op: "replace", path: ["appSettings", "theme"], value: "dark" },
    ]);

    unsubscribe();
  });

  test("describes a change to a document by the document it belongs to", () => {
    createEmptyDeviceClassEditor();

    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    updateCurrentEditor("Test Change", (editor) => {
      editor.basicData.modelName = "Renamed";
    });

    expect(change(listener).patches).toEqual([
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

    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    updateCurrentEditor("Test Change", (editor) => {
      editor.basicData.modelName = "Renamed";
    });
    unsubscribe();

    expect(change(listener).inversePatches).toEqual([
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

  test("names a change by the label it was made with", () => {
    createEmptyDeviceClassEditor();

    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    updateCurrentEditor("Rename Device", (editor) => {
      editor.basicData.modelName = "Renamed";
    });
    unsubscribe();

    expect(change(listener).label).toBe("Rename Device");
  });

  test("hands over the state on both sides of a change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    setTheme("dark");
    unsubscribe();

    expect(change(listener).previousState.appSettings.theme).toBe("system");
    expect(change(listener).state.appSettings.theme).toBe("dark");
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

describe("grouped changes", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
  });

  test("reports several updates as one change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    asOneChange("Rename Everything", () => {
      updateCurrentEditor("Rename Device", (editor) => {
        editor.basicData.modelName = "Renamed";
      });
      updateCurrentEditor("Rename Manufacturer", (editor) => {
        editor.basicData.manufacturerName = "Also renamed";
      });
    });
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(change(listener).label).toBe("Rename Everything");
    expect(change(listener).patches).toHaveLength(2);
  });

  test("puts a group back in the order that undoes it", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    asOneChange("Rename Twice", () => {
      updateCurrentEditor("Rename Device", (editor) => {
        editor.basicData.modelName = "Once";
      });
      updateCurrentEditor("Rename Device", (editor) => {
        editor.basicData.modelName = "Twice";
      });
    });
    unsubscribe();

    // Applied in order, the inverse patches have to end on the original value.
    expect(change(listener).inversePatches.map((patch) => patch.value)).toEqual(
      ["Once", "Test Model"],
    );
  });

  test("reports nothing for a group that changed nothing", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    asOneChange("Do Nothing", () => {
      updateCurrentEditor("Do Nothing", () => {});
    });
    unsubscribe();

    expect(listener).not.toHaveBeenCalled();
  });

  test("keeps grouping when a group is nested in another", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToStatePatches(listener);

    asOneChange("Outer", () => {
      asOneChange("Inner", () => {
        updateCurrentEditor("Rename Device", (editor) => {
          editor.basicData.modelName = "Renamed";
        });
      });
      updateCurrentEditor("Rename Manufacturer", (editor) => {
        editor.basicData.manufacturerName = "Also renamed";
      });
    });
    unsubscribe();

    expect(listener).toHaveBeenCalledTimes(1);
    expect(change(listener).label).toBe("Outer");
  });
});

// The change a listener was told about first.
function change(listener: ReturnType<typeof vi.fn>): StateChange {
  return (listener.mock.calls[0] as [StateChange])[0];
}

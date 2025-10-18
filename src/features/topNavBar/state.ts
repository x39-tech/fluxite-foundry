import { useShallow } from "zustand/shallow";
import { useAppPersistentStore, updateAppPersistentState } from "app/store";
import {
  AppPersistentState,
  DeviceClassEditorState,
  OpenEditors,
} from "app/persistentState";
import {
  getCurrentEditor,
  updateDmxController,
} from "features/deviceClassEditor/state";
import { newEntityId } from "app/stateUtils";
import { getNewDeviceClassEditor } from "features/deviceClassEditor/import";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useOpenEditors(): OpenEditors {
  return useAppPersistentStore((state) => state.openEditors);
}

export function useDeviceClassEditors(): {
  [key: string]: DeviceClassEditorState;
} {
  return useAppPersistentStore((state) => state.deviceClassEditors);
}

export function useEditorNames(): string[] {
  return useAppPersistentStore(
    useShallow((state) => getOpenEditorModelNames(state)),
  );
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function createDeviceClassEditor() {
  updateAppPersistentState((state) => {
    const deviceClassEditors = state.deviceClassEditors;
    const openEditors = state.openEditors;

    const existingIds = openEditors.editors.map(
      (editor) => deviceClassEditors[editor.id].deviceClassId,
    );

    const newId = newEntityId();
    deviceClassEditors[newId] = getNewDeviceClassEditor(existingIds);
    openEditors.editors.push({ type: "deviceClass", id: newId });
    openEditors.selectedEditor = openEditors.editors.length - 1;

    updateDmxController(deviceClassEditors[newId]);
  });
}

export function setSelectedEditor(index: number) {
  updateAppPersistentState((state) => {
    state.openEditors.selectedEditor = index;
    updateDmxController(getCurrentEditor(state)!);
  });
}

export function deleteEditor(index: number) {
  updateAppPersistentState((state) => {
    const editors = state.openEditors;
    if (index < 0 || index >= editors.editors.length) {
      return;
    }

    const editor = editors.editors[index];
    if (editor.type === "deviceClass") {
      delete state.deviceClassEditors[editor.id];
    }

    const newIndex: number =
      editors.editors.length === 1
        ? -1
        : index === editors.editors.length - 1
          ? index - 1
          : index;

    editors.selectedEditor = newIndex;
    editors.editors.splice(index, 1);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOpenEditorModelNames(state: AppPersistentState): string[] {
  return state.openEditors.editors.map((editor) => {
    switch (editor.type) {
      case "deviceClass": {
        return state.deviceClassEditors[editor.id].basicData.modelName;
      }
      default:
        return "";
    }
  });
}

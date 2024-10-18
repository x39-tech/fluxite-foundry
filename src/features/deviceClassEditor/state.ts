import * as FlexLayout from "flexlayout-react";
import { AppState, EditorType } from "app/state";
import { useAppStore } from "app/store";
import { DeviceClassEditorState } from "app/state";

export function useCurrentEditor(): DeviceClassEditorState | undefined {
  return useAppStore((state) => getCurrentEditor(state));
}

export function useCurrentEditorPart<T>(
  reducer: (state: DeviceClassEditorState) => T,
): T | undefined {
  return useAppStore((state) => {
    const currentEditor = getCurrentEditor(state);
    if (!currentEditor) {
      return undefined;
    }

    return reducer(currentEditor);
  });
}

export function useLibraries(): Record<string, string> | undefined {
  return useCurrentEditorPart((state) => state.libraries);
}

export function setWindowLayout(model: FlexLayout.IJsonModel) {
  useAppStore.setState((state) => {
    const currentEditor = getCurrentEditor(state);
    if (!currentEditor) {
      return;
    }

    currentEditor.windowLayout = model.layout;
  });
}

export function getCurrentEditor<S extends AppState>(
  state: S,
): DeviceClassEditorState | undefined {
  const currentEditor =
    state.openEditors.editors[state.openEditors.selectedEditor];
  if (!currentEditor || currentEditor.type != EditorType.DEVICE_CLASS) {
    return undefined;
  }
  return state.deviceClassEditors[currentEditor.id];
}

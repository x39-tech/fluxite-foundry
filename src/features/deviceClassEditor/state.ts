import * as FlexLayout from "flexlayout-react";
import { AppState, EditorType } from "app/state";
import { useAppStore } from "app/store";
import { DeviceClassEditorState } from "app/state";
import { lookupParameterClass, ParameterClassWithId } from "udr/udrDatabase";

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

export function useParametersWithClasses(): Record<
  string,
  ParameterClassWithId
> {
  return useAppStore((state) => {
    const currentEditor = getCurrentEditor(state);
    if (!currentEditor) {
      return {};
    }

    return Object.entries(currentEditor.parameters.parameters).reduce(
      (acc, [paramId, param]) => {
        if (!param.library) {
          return acc;
        }

        const libraryVersion = currentEditor.libraries[param.library];
        if (!libraryVersion) {
          return acc;
        }

        const paramClass = lookupParameterClass(
          state.udrDatabase,
          param.library,
          libraryVersion,
          param.class,
        );

        if (!paramClass) {
          return acc;
        }

        acc[paramId] = paramClass;
        return acc;
      },
      {} as Record<string, ParameterClassWithId>,
    );
  });
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

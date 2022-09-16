import { useAppSelector } from "app/hooks";
import { DeviceClassEditorState } from "./deviceClassEditorState";

export interface DeviceClassEditorsState {
  openEditors: {
    [id: string]: DeviceClassEditorState;
  };
  editorTabOrder: string[];
  selectedEditor: string;
}

export function defaultDeviceClassEditorsState(): DeviceClassEditorsState {
  return {
    openEditors: {},
    editorTabOrder: [],
    selectedEditor: "",
  };
}

export function useCurrentEditorSelector<ReturnedValue>(
  selector: (state: DeviceClassEditorState) => ReturnedValue
) {
  return useAppSelector((state) =>
    selector(state.editors.openEditors[state.editors.selectedEditor])
  );
}

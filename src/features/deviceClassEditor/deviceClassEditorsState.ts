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

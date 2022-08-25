import { DeviceClass } from "udr/objects/deviceClass";
import { getDefaultDeviceClass } from "udr/udr";

export interface EditorTabState {
  name: string;
  udr: DeviceClass;
  structuredItemEditors: Array<string>;
}

export function newEditorTab(name: string): EditorTabState {
  const udr = getDefaultDeviceClass();
  return {
    name,
    udr,
    structuredItemEditors: Object.keys(udr.structuredItems!),
  };
}

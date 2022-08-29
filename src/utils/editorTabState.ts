import { DeviceClass } from "udr/objects/deviceClass";
import { v4 as uuidv4 } from "uuid";
import { getDefaultDeviceClass } from "udr/udr";

interface ScalarItemEditor {
  id: string;
  udrId: string;
}

export interface EditorTabState {
  name: string;
  udr: DeviceClass;
  scalarItemEditors: Array<ScalarItemEditor>;
  structuredItemEditors: Array<string>;
}

export function newEditorTab(name: string): EditorTabState {
  const udr = getDefaultDeviceClass();
  return {
    name,
    udr,
    scalarItemEditors: Object.keys(udr.scalarItems!).map((id) => {
      return { id: uuidv4(), udrId: id };
    }),
    structuredItemEditors: Object.keys(udr.structuredItems!),
  };
}

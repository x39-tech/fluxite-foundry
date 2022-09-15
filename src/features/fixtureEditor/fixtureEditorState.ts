import { DeviceClass } from "udr/objects/deviceClass";
import { v4 as uuidv4 } from "uuid";
import { getDefaultDeviceClass } from "udr/udr";
import { getUniqueItemId } from "utils/utils";
import { MosaicNode } from "react-mosaic-component";

interface ItemEditor {
  id: string;
  udrId: string;
}

export enum FixtureEditorWindowType {
  ScalarItemsEditor,
  StructuredItemsEditor,
}

export interface FixtureEditorState {
  deviceClassId: string;
  udr: DeviceClass;
  scalarItemEditors: Array<ItemEditor>;
  structuredItemEditors: Array<ItemEditor>;
  windowLayout: MosaicNode<string> | null;
  windowTypes: { [id: string]: FixtureEditorWindowType };
}

export function newFixtureEditor(
  existingEditorIds: string[]
): FixtureEditorState {
  return importFixtureEditor(
    getUniqueItemId(existingEditorIds, "myDevice"),
    getDefaultDeviceClass()
  );
}

export function importFixtureEditor(
  id: string,
  udr: DeviceClass
): FixtureEditorState {
  return {
    deviceClassId: id,
    udr,
    scalarItemEditors: Object.keys(udr.scalarItems!).map((id) => {
      return { id: uuidv4(), udrId: id };
    }),
    structuredItemEditors: Object.keys(udr.structuredItems!).map((id) => {
      return { id: uuidv4(), udrId: id };
    }),
    windowLayout: {
      direction: "row",
      first: "scalar",
      second: "structured",
      splitPercentage: 50,
    },
    windowTypes: {
      scalar: FixtureEditorWindowType.ScalarItemsEditor,
      structured: FixtureEditorWindowType.StructuredItemsEditor,
    },
  };
}

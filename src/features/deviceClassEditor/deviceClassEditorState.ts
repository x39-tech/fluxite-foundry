import { nanoid } from "@reduxjs/toolkit";
import { MosaicNode } from "react-mosaic-component";
import { DeviceClass } from "udr/objects/deviceClass";
import { getDefaultDeviceClass } from "udr/udr";
import { getUniqueItemId } from "utils/utils";
import { ScalarItemsEditorState } from "./scalarItemsEditor/scalarItemsEditorState";
import { StructuredItemsEditorState } from "./structuredItemsEditor/structuredItemsEditorState";

export enum DeviceClassEditorWindowType {
  ScalarItemsEditor,
  StructuredItemsEditor,
}

interface BasicData {
  description: string;
  publishDate: string;
  author: string;
  history: Record<string, string>;
}

export interface DeviceClassEditorState {
  deviceClassId: string;
  basicData: BasicData;
  scalarItems: ScalarItemsEditorState;
  structuredItems: StructuredItemsEditorState;
  windowLayout: MosaicNode<string> | null;
  windowTypes: { [id: string]: DeviceClassEditorWindowType };
}

export function newDeviceClassEditor(
  existingEditorIds: string[]
): DeviceClassEditorState {
  return importDeviceClassEditor(
    getUniqueItemId(existingEditorIds, "myDevice"),
    getDefaultDeviceClass()
  );
}

export function importDeviceClassEditor(
  id: string,
  udr: DeviceClass
): DeviceClassEditorState {
  return {
    deviceClassId: id,
    basicData: {
      ...udr,
    },
    scalarItems: {
      scalarItems: udr.scalarItems || {},
      itemEditorLayout: Object.keys(udr.scalarItems || {}).map((id) => {
        return { id: nanoid(), udrId: id };
      }),
    },
    structuredItems: {
      structuredItems: udr.structuredItems || {},
      itemEditorLayout: Object.keys(udr.structuredItems || {}).map((id) => {
        return { id: nanoid(), udrId: id };
      }),
    },
    windowLayout: {
      direction: "row",
      first: "scalar",
      second: "structured",
      splitPercentage: 50,
    },
    windowTypes: {
      scalar: DeviceClassEditorWindowType.ScalarItemsEditor,
      structured: DeviceClassEditorWindowType.StructuredItemsEditor,
    },
  };
}

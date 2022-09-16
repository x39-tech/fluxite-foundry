import { nanoid } from "@reduxjs/toolkit";
import { MosaicNode } from "react-mosaic-component";
import { DeviceClass } from "udr/objects/deviceClass";
import { getDefaultDeviceClass } from "udr/udr";
import { getUniqueItemId } from "utils/utils";
import { ScalarItemsEditorState } from "./scalarItemsEditor/scalarItemsEditorState";
import { StructuredItemsEditorState } from "./structuredItemsEditor/structuredItemsEditorState";

export enum FixtureEditorWindowType {
  ScalarItemsEditor,
  StructuredItemsEditor,
}

interface BasicData {
  description: string;
  publishDate: string;
  author: string;
  history: Record<string, string>;
}

export interface FixtureEditorState {
  deviceClassId: string;
  basicData: BasicData;
  scalarItems: ScalarItemsEditorState;
  structuredItems: StructuredItemsEditorState;
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
      scalar: FixtureEditorWindowType.ScalarItemsEditor,
      structured: FixtureEditorWindowType.StructuredItemsEditor,
    },
  };
}

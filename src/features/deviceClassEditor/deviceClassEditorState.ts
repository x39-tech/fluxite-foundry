import { nanoid } from "@reduxjs/toolkit";
import FlexLayout from "flexlayout-react";

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
  windowLayout: FlexLayout.IJsonRowNode;
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
      type: "row",
      weight: 100,
      id: nanoid(),
      children: [
        {
          type: "tabset",
          weight: 50,
          id: nanoid(),
          children: [
            {
              type: "tab",
              name: "Scalar Items Editor",
              component: "scalarItemsEditor",
              id: nanoid(),
            },
          ],
        },
        {
          type: "tabset",
          weight: 50,
          id: nanoid(),
          children: [
            {
              type: "tab",
              name: "Structured Items Editor",
              component: "structuredItemsEditor",
              id: nanoid(),
            },
          ],
        },
      ],
    },
  };
}

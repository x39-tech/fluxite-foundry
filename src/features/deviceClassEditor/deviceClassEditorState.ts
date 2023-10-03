import { nanoid } from "@reduxjs/toolkit";
import FlexLayout from "flexlayout-react";

import {
  DeviceClass,
  DeviceClassInfo,
} from "generated/draft-2023-1/udr-document";
import { getDefaultDeviceClass } from "udr/udr";
import { getUniqueItemId } from "utils/utils";
import { ParametersEditorState } from "./parametersEditor/parametersEditorState";
import { StructuresEditorState } from "./structuresEditor/structuresEditorState";

export enum DeviceClassEditorWindowType {
  ParametersEditor,
  StructuresEditor,
}

export interface BasicData {
  "@description": string;
  publishDate: string;
  author: string;
  history: Record<string, string>;
  info: DeviceClassInfo;
}

export interface DeviceClassEditorState {
  deviceClassId: string;
  basicData: BasicData;
  parameters: ParametersEditorState;
  structures: StructuresEditorState;
  windowLayout: FlexLayout.IJsonRowNode;
}

export function newDeviceClassEditor(
  existingEditorIds: string[],
): DeviceClassEditorState {
  return importDeviceClassEditor(
    getUniqueItemId(existingEditorIds, "myDevice"),
    getDefaultDeviceClass(),
  );
}

export function importDeviceClassEditor(
  id: string,
  udr: DeviceClass,
): DeviceClassEditorState {
  return {
    deviceClassId: id,
    basicData: {
      ...udr,
    },
    parameters: {
      parameters: udr.parameters || {},
      itemEditorLayout: Object.keys(udr.parameters || {}).map((id) => {
        return { id: nanoid(), udrId: id };
      }),
    },
    structures: {
      structures: udr.structures || {},
      itemEditorLayout: Object.keys(udr.structures || {}).map((id) => {
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
              name: "Parameters Editor",
              component: "parametersEditor",
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
              name: "Device Info Editor",
              component: "deviceInfoEditor",
              id: nanoid(),
            },
          ],
        },
      ],
    },
  };
}

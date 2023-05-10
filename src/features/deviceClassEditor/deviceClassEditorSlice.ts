import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import * as FlexLayout from "flexlayout-react";

import {
  DeviceClassEditorState,
  importDeviceClassEditor,
  newDeviceClassEditor,
} from "features/deviceClassEditor/deviceClassEditorState";
import {
  defaultDeviceClassEditorsState,
  DeviceClassEditorsState,
} from "./deviceClassEditorsState";
import { DeviceClass } from "udr/objects/deviceClass";
import { isScalarItemsEditorAction } from "./scalarItemsEditor/scalarItemsEditorSlice";
import scalarItemsEditorReducer from "./scalarItemsEditor/scalarItemsEditorSlice";
import { isStructuredItemsEditorAction } from "./structuredItemsEditor/structuredItemsEditorSlice";
import structuredItemsEditorReducer from "./structuredItemsEditor/structuredItemsEditorSlice";

interface ImportedDeviceClass {
  id: string;
  udr: DeviceClass;
}

export interface NewScalarItem {
  class: string;
  id: string;
  friendlyName: string;
}

export function getCurrentEditor(
  state: DeviceClassEditorsState
): DeviceClassEditorState {
  return state.openEditors[state.selectedEditor];
}

export const deviceClassEditorSlice = createSlice({
  name: "deviceClassEditor",
  initialState: defaultDeviceClassEditorsState(),
  reducers: {
    newEditorCreated(state) {
      const newId = nanoid();
      state.openEditors[newId] = newDeviceClassEditor(
        Object.values(state.openEditors).map((editor) => editor.deviceClassId)
      );
      state.editorTabOrder.push(newId);
      state.selectedEditor = newId;
    },
    editorImported(state, action: PayloadAction<ImportedDeviceClass>) {
      const newId = nanoid();
      state.openEditors[newId] = importDeviceClassEditor(
        action.payload.id,
        action.payload.udr
      );
      state.editorTabOrder.push(newId);
      state.selectedEditor = newId;
    },
    editorDeleted(state, action: PayloadAction<string>) {
      if (action.payload in state.openEditors) {
        const index = state.editorTabOrder.findIndex((id) => {
          return id === action.payload;
        });

        const newId: string =
          state.editorTabOrder.length === 1
            ? ""
            : index === state.editorTabOrder.length - 1
            ? state.editorTabOrder[index - 1]
            : state.editorTabOrder[index + 1];

        state.selectedEditor = newId;
        delete state.openEditors[action.payload];
        state.editorTabOrder.splice(index, 1);
      }
    },
    selectedEditorChanged(state, action: PayloadAction<string>) {
      state.selectedEditor = action.payload;
    },
    windowLayoutUpdated(state, action: PayloadAction<FlexLayout.IJsonModel>) {
      getCurrentEditor(state).windowLayout = action.payload.layout;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(isScalarItemsEditorAction, (state, action) => {
      const currentEditor = state.openEditors[state.selectedEditor];
      currentEditor.scalarItems = scalarItemsEditorReducer(
        currentEditor.scalarItems,
        action
      );
    });
    builder.addMatcher(isStructuredItemsEditorAction, (state, action) => {
      const currentEditor = state.openEditors[state.selectedEditor];
      currentEditor.structuredItems = structuredItemsEditorReducer(
        currentEditor.structuredItems,
        action
      );
    });
  },
});

export const {
  newEditorCreated,
  editorImported,
  editorDeleted,
  selectedEditorChanged,
  windowLayoutUpdated,
} = deviceClassEditorSlice.actions;

export default deviceClassEditorSlice.reducer;

import { createSlice, nanoid, PayloadAction } from "@reduxjs/toolkit";
import * as FlexLayout from "flexlayout-react";

import {
  DeviceClassEditorState,
  importDeviceClassEditor,
  newDeviceClassEditor,
  BasicData,
} from "features/deviceClassEditor/deviceClassEditorState";
import {
  defaultDeviceClassEditorsState,
  DeviceClassEditorsState,
} from "./deviceClassEditorsState";
import { DeviceClass } from "generated/draft-2023-1/udr-document";
import parametersEditorReducer, {
  isParametersEditorAction,
} from "./parametersEditor/parametersEditorSlice";
import structuresEditorReducer, {
  isStructuresEditorAction,
} from "./structuresEditor/structuresEditorSlice";

interface ImportedDeviceClass {
  id: string;
  udr: DeviceClass;
}

export interface NewParameter {
  class: string;
  id: string;
  friendlyName: string;
}

export function getCurrentEditor(
  state: DeviceClassEditorsState,
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
        Object.values(state.openEditors).map((editor) => editor.deviceClassId),
      );
      state.editorTabOrder.push(newId);
      state.selectedEditor = newId;
    },
    editorImported(state, action: PayloadAction<ImportedDeviceClass>) {
      const newId = nanoid();
      state.openEditors[newId] = importDeviceClassEditor(
        action.payload.id,
        action.payload.udr,
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
    basicDataUpdated(state, action: PayloadAction<BasicData>) {
      getCurrentEditor(state).basicData = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder.addMatcher(isParametersEditorAction, (state, action) => {
      const currentEditor = state.openEditors[state.selectedEditor];
      currentEditor.parameters = parametersEditorReducer(
        currentEditor.parameters,
        action,
      );
    });
    builder.addMatcher(isStructuresEditorAction, (state, action) => {
      const currentEditor = state.openEditors[state.selectedEditor];
      currentEditor.structures = structuresEditorReducer(
        currentEditor.structures,
        action,
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
  basicDataUpdated,
} = deviceClassEditorSlice.actions;

export default deviceClassEditorSlice.reducer;

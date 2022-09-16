import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { MosaicNode } from "react-mosaic-component";
import { v4 as uuidv4 } from "uuid";
import {
  FixtureEditorState,
  importFixtureEditor,
  newFixtureEditor,
} from "features/fixtureEditor/fixtureEditorState";
import {
  defaultFixtureEditorsState,
  FixtureEditorsState,
} from "./fixtureEditorsState";
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
  state: FixtureEditorsState
): FixtureEditorState {
  return state.openEditors[state.selectedEditor];
}

export const fixtureEditorSlice = createSlice({
  name: "fixtureEditor",
  initialState: defaultFixtureEditorsState(),
  reducers: {
    createNewEditor(state) {
      const newId = uuidv4();
      state.openEditors[newId] = newFixtureEditor(
        Object.values(state.openEditors).map((editor) => editor.deviceClassId)
      );
      state.editorTabOrder.push(newId);
      state.selectedEditor = newId;
    },
    importEditor(state, action: PayloadAction<ImportedDeviceClass>) {
      const newId = uuidv4();
      state.openEditors[newId] = importFixtureEditor(
        action.payload.id,
        action.payload.udr
      );
      state.editorTabOrder.push(newId);
      state.selectedEditor = newId;
    },
    deleteEditor(state, action: PayloadAction<string>) {
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
    setSelectedEditor(state, action: PayloadAction<string>) {
      state.selectedEditor = action.payload;
    },
    windowLayoutUpdated(
      state,
      action: PayloadAction<MosaicNode<string> | null>
    ) {
      getCurrentEditor(state).windowLayout = action.payload;
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
  createNewEditor,
  importEditor,
  deleteEditor,
  setSelectedEditor,
  windowLayoutUpdated,
} = fixtureEditorSlice.actions;

export default fixtureEditorSlice.reducer;

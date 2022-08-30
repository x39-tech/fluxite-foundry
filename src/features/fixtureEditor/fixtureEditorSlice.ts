import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { ScalarItem, StructuredItemValue } from "udr/objects/item";
import { EditorTabState, newEditorTab } from "utils/editorTabState";
import { Access, Lifetime } from "udr/util/enums";

interface FixtureEditorState {
  openEditors: {
    [id: string]: EditorTabState;
  };
  editorTabOrder: string[];
  selectedEditor: string;
}

const initialState: FixtureEditorState = {
  openEditors: {
    "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02": newEditorTab("My Fixture"),
    "1f1c3350-1a14-4a4c-b90f-d8b076b4ae03": newEditorTab("My Fixture 2"),
  },
  editorTabOrder: [
    "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02",
    "1f1c3350-1a14-4a4c-b90f-d8b076b4ae03",
  ],
  selectedEditor: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02",
};

interface StructuredItemUpdate {
  name: string;
  newValue: StructuredItemValue;
}

interface NewScalarItem {
  class: string;
  id: string;
  friendlyName: string;
}

interface ScalarItemUpdate {
  id: string;
  newValue: ScalarItem;
}

interface ScalarItemIdUpdate {
  id: string;
  newId: string;
}

export const fixtureEditorSlice = createSlice({
  name: "fixtureEditor",
  initialState,
  reducers: {
    createNewEditor(state) {
      const newId = uuidv4();
      state.openEditors[newId] = newEditorTab("New Device");
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
    createNewScalarItem(state, action: PayloadAction<NewScalarItem>) {
      state.openEditors[state.selectedEditor].udr.scalarItems![
        action.payload.id
      ] = {
        class: action.payload.class,
        access: Access.READWRITE,
        lifetime: Lifetime.RUNTIME,
        friendlyName: action.payload.friendlyName,
      };
    },
    updateScalarItem(state, action: PayloadAction<ScalarItemUpdate>) {
      state.openEditors[state.selectedEditor].udr.scalarItems![
        action.payload.id
      ] = action.payload.newValue;
    },
    updateScalarItemId(state, action: PayloadAction<ScalarItemIdUpdate>) {
      const currentEditor = state.openEditors[state.selectedEditor];

      // Update UDR
      currentEditor.udr.scalarItems![action.payload.newId] =
        currentEditor.udr.scalarItems![action.payload.id];
      delete currentEditor.udr.scalarItems![action.payload.id];

      // Update UI state
      currentEditor.scalarItemEditors.forEach((siEditorState) => {
        if (siEditorState.udrId === action.payload.id) {
          siEditorState.udrId = action.payload.newId;
        }
      });
    },
    updateStructuredItem(state, action: PayloadAction<StructuredItemUpdate>) {
      state.openEditors[state.selectedEditor].udr.structuredItems![
        action.payload.name
      ].default = action.payload.newValue;
    },
  },
});

export const {
  createNewEditor,
  deleteEditor,
  setSelectedEditor,
  updateScalarItem,
  updateScalarItemId,
  updateStructuredItem,
} = fixtureEditorSlice.actions;

export default fixtureEditorSlice.reducer;

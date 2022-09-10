import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { v4 as uuidv4 } from "uuid";
import { ScalarItem, StructuredItemValue } from "udr/objects/item";
import {
  FixtureEditorState,
  newFixtureEditor,
} from "features/fixtureEditor/fixtureEditorState";
import { Access, Lifetime } from "udr/util/enums";
import { getDefaultStructuredItemFactory } from "utils/itemDatabase";
import {
  defaultFixtureEditorsState,
  FixtureEditorsState,
} from "./fixtureEditorsState";

export interface NewScalarItem {
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

interface NewStructuredItem {
  class: string;
  id: string;
}

interface StructuredItemUpdate {
  id: string;
  newValue: StructuredItemValue;
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
      state.openEditors[newId] = newFixtureEditor("New Device");
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
      const currentEditor = getCurrentEditor(state);

      if (action.payload.id in currentEditor.udr.scalarItems!) {
        return;
      }

      currentEditor.udr.scalarItems![action.payload.id] = {
        class: action.payload.class,
        access: Access.READWRITE,
        lifetime: Lifetime.RUNTIME,
        friendlyName: action.payload.friendlyName,
      };

      currentEditor.scalarItemEditors.push({
        id: uuidv4(),
        udrId: action.payload.id,
      });
    },
    updateScalarItem(state, action: PayloadAction<ScalarItemUpdate>) {
      getCurrentEditor(state).udr.scalarItems![action.payload.id] =
        action.payload.newValue;
    },
    updateScalarItemId(state, action: PayloadAction<ScalarItemIdUpdate>) {
      const currentEditor = getCurrentEditor(state);

      if (action.payload.newId in currentEditor.udr.scalarItems!) {
        return;
      }

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
    deleteScalarItem(state, action: PayloadAction<string>) {
      const currentEditor = getCurrentEditor(state);
      delete currentEditor.udr.scalarItems![action.payload];
      currentEditor.scalarItemEditors = currentEditor.scalarItemEditors.filter(
        (value) => value.udrId !== action.payload
      );
    },
    createNewStructuredItem(state, action: PayloadAction<NewStructuredItem>) {
      const currentEditor = getCurrentEditor(state);

      if (action.payload.id in currentEditor.udr.structuredItems!) {
        return;
      }

      const factory = getDefaultStructuredItemFactory();
      if (!(action.payload.class in factory)) {
        return;
      }

      currentEditor.udr.structuredItems![action.payload.id] =
        factory[action.payload.class]();

      currentEditor.structuredItemEditors.push({
        id: uuidv4(),
        udrId: action.payload.id,
      });
    },
    updateStructuredItem(state, action: PayloadAction<StructuredItemUpdate>) {
      getCurrentEditor(state).udr.structuredItems![action.payload.id].default =
        action.payload.newValue;
    },
    deleteStructuredItem(state, action: PayloadAction<string>) {
      const currentEditor = getCurrentEditor(state);
      delete currentEditor.udr.structuredItems![action.payload];
      currentEditor.structuredItemEditors =
        currentEditor.structuredItemEditors.filter(
          (value) => value.udrId !== action.payload
        );
    },
  },
});

export const {
  createNewEditor,
  deleteEditor,
  setSelectedEditor,
  createNewScalarItem,
  updateScalarItem,
  updateScalarItemId,
  deleteScalarItem,
  createNewStructuredItem,
  updateStructuredItem,
  deleteStructuredItem,
} = fixtureEditorSlice.actions;

export default fixtureEditorSlice.reducer;

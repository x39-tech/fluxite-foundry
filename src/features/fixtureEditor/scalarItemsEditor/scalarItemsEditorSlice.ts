import {
  AnyAction,
  createSlice,
  nanoid,
  PayloadAction,
} from "@reduxjs/toolkit";
import { ScalarItem } from "udr/objects/item";
import { Access, Lifetime } from "udr/util/enums";
import { defaultScalarItemsEditorState } from "./scalarItemsEditorState";

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

const ACTION_PREFIX = "scalarItemsEditor";

export function isScalarItemsEditorAction(action: AnyAction): boolean {
  return action.type.startsWith(ACTION_PREFIX);
}

export const scalarItemsEditorSlice = createSlice({
  name: ACTION_PREFIX,
  initialState: defaultScalarItemsEditorState(),
  reducers: {
    newScalarItemCreated(state, action: PayloadAction<NewScalarItem>) {
      if (action.payload.id in state.scalarItems) {
        return;
      }

      state.scalarItems[action.payload.id] = {
        class: action.payload.class,
        access: Access.READWRITE,
        lifetime: Lifetime.RUNTIME,
        friendlyName: action.payload.friendlyName,
      };

      state.itemEditorLayout.push({
        id: nanoid(),
        udrId: action.payload.id,
      });
    },
    scalarItemUpdated(state, action: PayloadAction<ScalarItemUpdate>) {
      state.scalarItems[action.payload.id] = action.payload.newValue;
    },
    scalarItemIdUpdated(state, action: PayloadAction<ScalarItemIdUpdate>) {
      if (action.payload.newId in state.scalarItems) {
        return;
      }

      // Update UDR
      state.scalarItems[action.payload.newId] =
        state.scalarItems[action.payload.id];
      delete state.scalarItems[action.payload.id];

      // Update UI state
      state.itemEditorLayout.forEach((siEditorState) => {
        if (siEditorState.udrId === action.payload.id) {
          siEditorState.udrId = action.payload.newId;
        }
      });
    },
    scalarItemDeleted(state, action: PayloadAction<string>) {
      delete state.scalarItems[action.payload];
      state.itemEditorLayout = state.itemEditorLayout.filter(
        (value) => value.udrId !== action.payload
      );
    },
  },
});

export const {
  newScalarItemCreated,
  scalarItemUpdated,
  scalarItemIdUpdated,
  scalarItemDeleted,
} = scalarItemsEditorSlice.actions;

export default scalarItemsEditorSlice.reducer;

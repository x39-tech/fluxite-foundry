import {
  AnyAction,
  createSlice,
  nanoid,
  PayloadAction,
} from "@reduxjs/toolkit";
import { StructuredItemValue } from "udr/objects/item";
import { getDefaultStructuredItemFactory } from "utils/itemDatabase";
import { defaultStructuredItemsEditorState } from "./structuredItemsEditorState";

interface NewStructuredItem {
  class: string;
  id: string;
}

interface StructuredItemUpdate {
  id: string;
  newValue: StructuredItemValue;
}

const ACTION_PREFIX = "structuredItemsEditor";

export function isStructuredItemsEditorAction(action: AnyAction): boolean {
  return action.type.startsWith(ACTION_PREFIX);
}

export const structuredItemsEditorSlice = createSlice({
  name: ACTION_PREFIX,
  initialState: defaultStructuredItemsEditorState(),
  reducers: {
    newStructuredItemCreated(state, action: PayloadAction<NewStructuredItem>) {
      if (action.payload.id in state.structuredItems) {
        return;
      }

      const factory = getDefaultStructuredItemFactory();
      if (!(action.payload.class in factory)) {
        return;
      }

      state.structuredItems[action.payload.id] =
        factory[action.payload.class]();

      state.itemEditorLayout.push({
        id: nanoid(),
        udrId: action.payload.id,
      });
    },
    structuredItemUpdated(state, action: PayloadAction<StructuredItemUpdate>) {
      state.structuredItems[action.payload.id].default =
        action.payload.newValue;
    },
    structuredItemDeleted(state, action: PayloadAction<string>) {
      delete state.structuredItems[action.payload];
      state.itemEditorLayout = state.itemEditorLayout.filter(
        (value) => value.udrId !== action.payload
      );
    },
  },
});

export const {
  newStructuredItemCreated,
  structuredItemUpdated,
  structuredItemDeleted,
} = structuredItemsEditorSlice.actions;

export default structuredItemsEditorSlice.reducer;

import {
  AnyAction,
  createSlice,
  nanoid,
  PayloadAction,
} from "@reduxjs/toolkit";
import { defaultStructuresEditorState } from "./structuresEditorState";

// Temp: TODO Fix
/* eslint-disable */
export type StructureValue = any;
function getDefaultStructureFactory(): { [k: string]: any } {
  return {};
}
/* eslint-enable */

interface NewStructure {
  class: string;
  id: string;
}

interface StructureUpdate {
  id: string;
  newValue: StructureValue;
}

const ACTION_PREFIX = "structuresEditor";

export function isStructuresEditorAction(action: AnyAction): boolean {
  return action.type.startsWith(ACTION_PREFIX);
}

export const structuresEditorSlice = createSlice({
  name: ACTION_PREFIX,
  initialState: defaultStructuresEditorState(),
  reducers: {
    newStructureCreated(state, action: PayloadAction<NewStructure>) {
      if (action.payload.id in state.structures) {
        return;
      }

      const factory = getDefaultStructureFactory();
      if (!(action.payload.class in factory)) {
        return;
      }

      state.structures[action.payload.id] = factory[action.payload.class]();

      state.itemEditorLayout.push({
        id: nanoid(),
        udrId: action.payload.id,
      });
    },
    structureUpdated(state, action: PayloadAction<StructureUpdate>) {
      state.structures[action.payload.id].default = action.payload.newValue;
    },
    structureDeleted(state, action: PayloadAction<string>) {
      delete state.structures[action.payload];
      state.itemEditorLayout = state.itemEditorLayout.filter(
        (value) => value.udrId !== action.payload,
      );
    },
  },
});

export const { newStructureCreated, structureUpdated, structureDeleted } =
  structuresEditorSlice.actions;

export default structuresEditorSlice.reducer;

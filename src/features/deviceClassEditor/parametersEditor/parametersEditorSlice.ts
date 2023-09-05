import {
  AnyAction,
  createSlice,
  nanoid,
  PayloadAction,
} from "@reduxjs/toolkit";
import {
  Parameter,
  Access,
  Lifetime,
} from "generated/draft-2023-1/udr-document";
import { defaultParametersEditorState } from "./parametersEditorState";

export interface NewParameter {
  class: string;
  id: string;
  friendlyName: string;
}

interface ParameterUpdate {
  id: string;
  newValue: Parameter;
}

interface ParameterIdUpdate {
  id: string;
  newId: string;
}

const ACTION_PREFIX = "parametersEditor";

export function isParametersEditorAction(action: AnyAction): boolean {
  return action.type.startsWith(ACTION_PREFIX);
}

export const parametersEditorSlice = createSlice({
  name: ACTION_PREFIX,
  initialState: defaultParametersEditorState(),
  reducers: {
    newParameterCreated(state, action: PayloadAction<NewParameter>) {
      if (action.payload.id in state.parameters) {
        return;
      }

      state.parameters[action.payload.id] = {
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
    parameterUpdated(state, action: PayloadAction<ParameterUpdate>) {
      state.parameters[action.payload.id] = action.payload.newValue;
    },
    parameterIdUpdated(state, action: PayloadAction<ParameterIdUpdate>) {
      if (action.payload.newId in state.parameters) {
        return;
      }

      // Update UDR
      state.parameters[action.payload.newId] =
        state.parameters[action.payload.id];
      delete state.parameters[action.payload.id];

      // Update UI state
      state.itemEditorLayout.forEach((siEditorState) => {
        if (siEditorState.udrId === action.payload.id) {
          siEditorState.udrId = action.payload.newId;
        }
      });
    },
    parameterDeleted(state, action: PayloadAction<string>) {
      delete state.parameters[action.payload];
      state.itemEditorLayout = state.itemEditorLayout.filter(
        (value) => value.udrId !== action.payload,
      );
    },
  },
});

export const {
  newParameterCreated,
  parameterUpdated,
  parameterIdUpdated,
  parameterDeleted,
} = parametersEditorSlice.actions;

export default parametersEditorSlice.reducer;

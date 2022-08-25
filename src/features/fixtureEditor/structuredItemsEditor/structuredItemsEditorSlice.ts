import { createSlice } from "@reduxjs/toolkit";
import { StructuredItem } from "udr/objects/item";

interface State {
  [key: string]: StructuredItem;
}

export function getStructuredItemsEditorSlice(initialState: State) {
  return createSlice({
    name: "structuredItemsEditor",
    initialState,
    reducers: {},
  });
}

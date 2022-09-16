import { ScalarItem } from "udr/objects/item";

interface ItemEditor {
  id: string;
  udrId: string;
}

export interface ScalarItemsEditorState {
  itemEditorLayout: Array<ItemEditor>;
  scalarItems: Record<string, ScalarItem>;
}

export function defaultScalarItemsEditorState(): ScalarItemsEditorState {
  return {
    itemEditorLayout: [],
    scalarItems: {},
  };
}

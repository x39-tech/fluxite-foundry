import { StructuredItem } from "udr/objects/item";

interface ItemEditor {
  id: string;
  udrId: string;
}

export interface StructuredItemsEditorState {
  itemEditorLayout: Array<ItemEditor>;
  structuredItems: Record<string, StructuredItem>;
}

export function defaultStructuredItemsEditorState(): StructuredItemsEditorState {
  return {
    itemEditorLayout: [],
    structuredItems: {},
  };
}

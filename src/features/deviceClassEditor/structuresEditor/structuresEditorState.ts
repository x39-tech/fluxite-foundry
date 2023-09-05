import { Structure } from "generated/draft-2023-1/udr-document";

interface ItemEditor {
  id: string;
  udrId: string;
}

export interface StructuresEditorState {
  itemEditorLayout: Array<ItemEditor>;
  structures: Record<string, Structure>;
}

export function defaultStructuresEditorState(): StructuresEditorState {
  return {
    itemEditorLayout: [],
    structures: {},
  };
}

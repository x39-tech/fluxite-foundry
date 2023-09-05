import { Parameter } from "generated/draft-2023-1/udr-document";

interface ItemEditor {
  id: string;
  udrId: string;
}

export interface ParametersEditorState {
  itemEditorLayout: Array<ItemEditor>;
  parameters: Record<string, Parameter>;
}

export function defaultParametersEditorState(): ParametersEditorState {
  return {
    itemEditorLayout: [],
    parameters: {},
  };
}

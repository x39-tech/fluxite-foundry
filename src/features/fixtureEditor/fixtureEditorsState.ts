import { FixtureEditorState } from "./fixtureEditorState";

export interface FixtureEditorsState {
  openEditors: {
    [id: string]: FixtureEditorState;
  };
  editorTabOrder: string[];
  selectedEditor: string;
}

export function defaultFixtureEditorsState(): FixtureEditorsState {
  return {
    openEditors: {},
    editorTabOrder: [],
    selectedEditor: "",
  };
}

import { useAppSelector } from "app/hooks";
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

export function useCurrentEditorSelector<ReturnedValue>(
  selector: (state: FixtureEditorState) => ReturnedValue
) {
  return useAppSelector((state) =>
    selector(
      state.fixtureEditor.openEditors[state.fixtureEditor.selectedEditor]
    )
  );
}

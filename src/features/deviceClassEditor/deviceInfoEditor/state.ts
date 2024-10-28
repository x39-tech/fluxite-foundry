import { Draft } from "immer";
import { updateCurrentEditor, useCurrentEditorPart } from "../state";
import { BasicData } from "app/state";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useBasicData(): BasicData | undefined {
  return useCurrentEditorPart((state) => state.basicData);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function modifyBasicData(recipe: (state: Draft<BasicData>) => void) {
  updateCurrentEditor((editor) => {
    recipe(editor.basicData);
  });
}

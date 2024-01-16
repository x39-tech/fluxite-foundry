import { Draft } from "immer";
import { getCurrentEditor, useCurrentEditorPart } from "../state";
import { useAppStore } from "app/store";
import { BasicData } from "app/state";

export function useBasicData(): BasicData | undefined {
  return useCurrentEditorPart((state) => state.basicData);
}

export function modifyBasicData(recipe: (state: Draft<BasicData>) => void) {
  useAppStore.setState((state) => {
    const basicData = getCurrentEditor(state)?.basicData;
    if (!basicData) {
      return;
    }

    recipe(basicData);
  });
}

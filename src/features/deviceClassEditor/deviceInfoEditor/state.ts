import { Draft } from "immer";
import {
  modifyLocalizationString,
  updateCurrentEditor,
  useCurrentEditorPart,
} from "../state";
import { BasicData } from "app/state";
import { DefinitionLocalization } from "e173";

export interface LocalizedBasicData extends Omit<BasicData, "@description"> {
  description: string;
}

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

export function modifyBasicDataDescription(newDescription: string) {
  updateCurrentEditor((editor) => {
    modifyLocalizationString(
      editor,
      editor.basicData["@description"],
      newDescription,
    );
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function getLocalizedBasicData(
  basicData: BasicData,
  localizations: Record<string, DefinitionLocalization>,
): LocalizedBasicData {
  const { "@description": descId, ...rest } = basicData;

  const localizedName = localizations["en-US"]?.strings?.[descId];

  return {
    ...rest,
    description: localizedName || descId,
  };
}

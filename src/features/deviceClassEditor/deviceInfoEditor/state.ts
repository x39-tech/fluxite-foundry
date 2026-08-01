import { Draft } from "immer";
import { updateCurrentEditor, useCurrentEditorPartShallow } from "../state";
import { setDeviceClassLocalizedValue } from "../localizationRegistry";
import { DeviceClassBasicData } from "app/persistentState";
import { Unlocalized } from "features/localizations/types";
import { localize, LocalizedString } from "features/localizations/localize";
import { useCurrentLocale } from "app/store";

export interface LocalizedBasicData extends Unlocalized<DeviceClassBasicData> {
  description: LocalizedString;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useBasicData(): LocalizedBasicData | undefined {
  const locale = useCurrentLocale();
  const editorPart = useCurrentEditorPartShallow((editor) => {
    return [editor.basicData, editor.localizations] as const;
  });

  if (!editorPart) {
    return undefined;
  }

  const [basicData, localizations] = editorPart;

  const description = localize(
    localizations,
    basicData.localized.description,
    locale,
  );

  return {
    ...basicData,
    description,
  };
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function modifyBasicData(
  recipe: (state: Draft<Unlocalized<DeviceClassBasicData>>) => void,
) {
  updateCurrentEditor((editor) => {
    recipe(editor.basicData);
  });
}

export function modifyBasicDataLocalizedValue(
  key: keyof DeviceClassBasicData["localized"],
  newValue: string,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    setDeviceClassLocalizedValue(
      editor,
      { table: "basicData", field: key },
      newValue,
      locale,
    );
  });
}

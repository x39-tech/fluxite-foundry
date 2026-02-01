import { Draft } from "immer";
import {
  updateCurrentEditor,
  updateLocalizedValue,
  useCurrentEditorPartShallow,
} from "../state";
import {
  DeviceClassBasicData,
  LocalizationReferencedItem,
  Unlocalized,
} from "app/persistentState";
import { localize, LocalizedString } from "utils/localizationUtils";
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

const BASIC_DATA_LOCALIZED_INFO: Record<
  keyof DeviceClassBasicData["localized"],
  {
    itemType: LocalizationReferencedItem["itemType"];
    constructKey: () => string;
  }
> = {
  description: {
    itemType: "devClassDesc",
    constructKey: () => `devClass_description`,
  },
};

export function modifyBasicDataLocalizedValue(
  key: keyof DeviceClassBasicData["localized"],
  newValue: string,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    const basicData = editor.basicData;
    updateLocalizedValue(editor, basicData, {
      fieldKey: key,
      newValue,
      locale,
      constructKey: BASIC_DATA_LOCALIZED_INFO[key].constructKey,
      referencedItem: {
        itemType: "devClassDesc",
      },
      isRequired: true, // description field is required in the schema
    });
  });
}

import { Draft } from "immer";
import {
  ClassReference,
  CodexId,
  EntityId,
  LocalizationReferencedItem,
  Parameter,
  ParameterClass,
  Unlocalized,
} from "app/persistentState";
import { getWithId, selectWithIds } from "app/stateUtils";
import { localize, LocalizedString } from "utils/localizationUtils";
import { useCurrentLocale, useCodexDatabase } from "app/store";
import {
  removeReferencedLocalization,
  updateCurrentEditor,
  updateLocalizedValue,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
} from "../state";
import {
  LocalizedInstanceEnumChoice,
  lookupDeviceParameterClass,
  lookupParameterClass,
  ResolvedParameterClass,
} from "../stateTransformations";
import { newEntityId } from "app/stateUtils";

export interface LocalizedParameter extends Unlocalized<Parameter> {
  friendlyName?: LocalizedString;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useParameters(): Record<EntityId, Parameter> | undefined {
  return useCurrentEditorPart((state) => state.parameters);
}

export function useParameterClasses():
  | Record<EntityId, ParameterClass>
  | undefined {
  return useCurrentEditorPart((state) => state.parameterClasses);
}

export function useParameterEditors(): EntityId[] {
  return useCurrentEditorPart((state) => state.parameterEditors) || [];
}

export function useParameterCodexIds(): CodexId[] {
  const ids = useCurrentEditorPartShallow((state) =>
    Object.values(state.parameters).map((param) => param.codexId),
  );
  return ids ?? [];
}

export function useParameterInfo(id: EntityId):
  | {
      param: LocalizedParameter;
      paramClass?: ResolvedParameterClass;
      instanceEnumChoices: LocalizedInstanceEnumChoice[];
    }
  | undefined {
  const editorPart = useCurrentEditorPartShallow((editor) => {
    return [
      editor.parameters[id],
      editor.libraries,
      editor.parameterClasses,
      editor.enumChoices,
      editor.localizations,
    ] as const;
  });
  const locale = useCurrentLocale();
  const database = useCodexDatabase();

  if (!editorPart) return undefined;

  const [param, libraries, deviceParamClasses, enumChoices, localizations] =
    editorPart;

  if (!param) return undefined;

  let paramClass = undefined;
  if (param.class.type === "imported") {
    const libraryVersion = libraries[param.class.library];
    if (!libraryVersion) {
      return undefined;
    }

    paramClass = lookupParameterClass(
      database,
      param.class.codexId,
      param.class.library,
      libraryVersion,
      locale,
    );
  } else {
    paramClass = lookupDeviceParameterClass(
      deviceParamClasses,
      localizations,
      enumChoices,
      param.class.id,
      locale,
    );
  }

  const friendlyName = param.localized.friendlyName
    ? localize(localizations, param.localized.friendlyName, locale)
    : undefined;

  const localizedParam = {
    ...param,
    friendlyName,
  };

  const paramEnumChoices = selectWithIds(
    enumChoices,
    (choice) =>
      choice.parent.type === "paramAdditional" && choice.parent.id === id,
  );
  paramEnumChoices.sort((e1, e2) => e1.index - e2.index);

  return {
    param: localizedParam,
    paramClass,
    instanceEnumChoices: paramEnumChoices.map((choice) => {
      const name = localize(localizations, choice.localized.name, locale);
      const description = choice.localized.description
        ? localize(localizations, choice.localized.description, locale)
        : undefined;

      return {
        ...choice,
        name,
        description,
      };
    }),
  };
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function createNewParameter(
  library: string | undefined,
  paramClass: CodexId,
  codexId: CodexId,
) {
  updateCurrentEditor((editor) => {
    if (
      Object.values(editor.parameters).some(
        (param) => param.codexId === codexId,
      )
    ) {
      return;
    }

    let classRef: ClassReference;
    if (library === undefined) {
      const pc = getWithId(
        editor.parameterClasses,
        (cls) => cls.codexId === paramClass,
      );
      if (!pc) {
        return;
      }
      classRef = { type: "local", codexId: pc.codexId, id: pc.id };
    } else {
      classRef = { type: "imported", codexId: paramClass, library };
    }

    const paramId = newEntityId();

    editor.parameters[paramId] = {
      codexId,
      localized: {},
      class: classRef,
      access: ["readActual", "write"],
      lifetime: "runtime",
    };

    editor.parameterEditors.push(paramId);
  });
}

export function modifyParameter(
  id: EntityId,
  recipe: (state: Draft<Unlocalized<Parameter>>) => void,
) {
  updateCurrentEditor((editor) => {
    const param = editor.parameters[id];
    if (!param) {
      return;
    }

    recipe(param);
  });
}

const PARAM_LOCALIZED_INFO: Record<
  keyof Parameter["localized"],
  {
    itemType: LocalizationReferencedItem["itemType"];
    constructKey: (codexId: string) => string;
  }
> = {
  friendlyName: {
    itemType: "paramName",
    constructKey: (codexId) => `param_${codexId}`,
  },
};

export function modifyParameterLocalizedValue(
  id: EntityId,
  key: keyof Parameter["localized"],
  newValue: string,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    const param = editor.parameters[id];
    if (!param) {
      return;
    }

    const info = PARAM_LOCALIZED_INFO[key];
    updateLocalizedValue(editor, param, {
      fieldKey: key,
      newValue,
      locale,
      constructKey: () => info.constructKey(param.codexId),
      referencedItem: {
        itemId: id,
        itemType: info.itemType,
      },
    });
  });
}

export function deleteParameter(id: EntityId) {
  updateCurrentEditor((editor) => {
    const param = editor.parameters[id];
    if (!param) {
      return;
    }

    const enumChoices = selectWithIds(
      editor.enumChoices,
      (choice) =>
        choice.parent.type === "paramAdditional" && choice.parent.id === id,
    );

    for (const choice of enumChoices) {
      removeReferencedLocalization(editor, choice.localized.name, {
        itemType: "enumName",
        itemId: choice.id,
      });
      removeReferencedLocalization(editor, choice.localized.description, {
        itemType: "enumDesc",
        itemId: choice.id,
      });
      delete editor.enumChoices[choice.id];
    }

    removeReferencedLocalization(editor, param.localized.friendlyName, {
      itemType: "paramName",
      itemId: id,
    });

    delete editor.parameters[id];
    editor.parameterEditors = editor.parameterEditors.filter(
      (value) => value !== id,
    );
  });
}

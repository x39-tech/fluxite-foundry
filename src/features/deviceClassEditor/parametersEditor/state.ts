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
import { ItemEditor } from "utils/utils";
import { localize, LocalizedString } from "utils/localizationUtils";
import { useCurrentLocale, useLibraryStore } from "app/store";
import {
  removeReferencedLocalization,
  updateCurrentEditor,
  updateLocalizedValue,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
  useDeviceLibrary,
  useLibraries,
} from "../state";
import {
  LocalizedInstanceEnumChoice,
  lookupParameterClass,
  ResolvedParameterClass,
} from "../stateTransformations";
import { resolveClassRef } from "../classResolution";
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

export function useParameterEditors(): ItemEditor[] {
  const editorIds =
    useCurrentEditorPartShallow((state) => state.parameterEditors) || [];
  const codexIds =
    useCurrentEditorPartShallow((state) =>
      editorIds.map((id) =>
        state.parameters[id] ? state.parameters[id].codexId : null,
      ),
    ) || [];

  return editorIds.reduce<ItemEditor[]>((acc, id, index) => {
    const codexId = codexIds[index];
    if (codexId) {
      acc.push({ id, codexId });
    }
    return acc;
  }, []);
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
  const deviceLibrary = useDeviceLibrary();
  const importedLibs = useLibraries();
  const param = useCurrentEditorPart((editor) => editor.parameters[id]);
  const locale = useCurrentLocale();
  const libraryStore = useLibraryStore();

  if (!deviceLibrary || !importedLibs || !param) return undefined;

  const { enumChoices, localizations } = deviceLibrary;

  const resolved = resolveClassRef(
    param.class,
    importedLibs,
    deviceLibrary,
    libraryStore,
    "parameterClasses",
  );
  const paramClass = resolved
    ? lookupParameterClass(resolved, locale)
    : undefined;

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
      classRef = { type: "local", id: pc.id };
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

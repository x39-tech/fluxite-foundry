import { Draft } from "immer";
import {
  ClassReference,
  CodexId,
  EntityId,
  Parameter,
  ParameterClass,
} from "app/persistentState";
import { getWithId, selectWithIds } from "app/stateUtils";
import { ItemEditor } from "utils/utils";
import { Unlocalized } from "features/localizations/types";
import { localize, LocalizedString } from "features/localizations/localize";
import { useCurrentLocale, useLibraryStore } from "app/store";
import {
  updateCurrentEditor,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
  useDeviceLibrary,
  useLibraries,
  useSourceLocale,
} from "../state";
import {
  removeDeviceClassLocalizations,
  setDeviceClassLocalizedValue,
} from "../localizationRegistry";
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
  const sourceLocale = useSourceLocale();
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
    ? lookupParameterClass(resolved, locale, sourceLocale)
    : undefined;

  const friendlyName = param.localized.friendlyName
    ? localize(
        localizations,
        param.localized.friendlyName,
        locale,
        sourceLocale,
      )
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
      const name = localize(
        localizations,
        choice.localized.name,
        locale,
        sourceLocale,
      );
      const description = choice.localized.description
        ? localize(
            localizations,
            choice.localized.description,
            locale,
            sourceLocale,
          )
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
  updateCurrentEditor("Add Parameter", (editor) => {
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
  updateCurrentEditor("Edit Parameter", (editor) => {
    const param = editor.parameters[id];
    if (!param) {
      return;
    }

    recipe(param);
  });
}

export function modifyParameterLocalizedValue(
  id: EntityId,
  key: keyof Parameter["localized"],
  newValue: string,
  locale: string,
) {
  updateCurrentEditor("Edit Parameter", (editor) => {
    setDeviceClassLocalizedValue(
      editor,
      { table: "parameters", entityId: id, field: key },
      newValue,
      locale,
    );
  });
}

export function deleteParameter(id: EntityId) {
  updateCurrentEditor("Delete Parameter", (editor) => {
    const param = editor.parameters[id];
    if (!param) {
      return;
    }

    const enumChoices = selectWithIds(
      editor.enumChoices,
      (choice) =>
        choice.parent.type === "paramAdditional" && choice.parent.id === id,
    );

    removeDeviceClassLocalizations(editor, [
      { table: "parameters", entityId: id },
      ...enumChoices.map((choice) => ({
        table: "enumChoices" as const,
        entityId: choice.id,
      })),
    ]);

    for (const choice of enumChoices) {
      delete editor.enumChoices[choice.id];
    }

    delete editor.parameters[id];
    editor.parameterEditors = editor.parameterEditors.filter(
      (value) => value !== id,
    );
  });
}

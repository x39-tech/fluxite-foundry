import { Draft } from "immer";
import * as FlexLayout from "flexlayout-react";
import {
  AppPersistentState,
  CodexId,
  DeviceClassDocument,
  documentTypes,
  EntityId,
  EnumChoice,
  EnumChoiceParent,
  Localization,
  LocalizationKey,
} from "app/persistentState";
import { Unlocalized } from "features/localizations/types";
import {
  getCurrentDocumentOfType,
  setDocumentLayout,
  updateCurrentDocumentOfType,
  useCurrentDocumentPart,
  useCurrentDocumentPartShallow,
} from "app/documents";
import {
  enumChoiceParentsEqual,
  newEntityId,
  select,
  selectWithIds,
} from "app/stateUtils";
import { Library } from "codex/library";
import {
  createDeviceClassLocalizations,
  getParentLocIdPrefix,
  removeDeviceClassLocalizations,
  setDeviceClassLocalizedValue,
} from "./localizationRegistry";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export { useCurrentDocumentId as useCurrentEditorId } from "app/documents";

export function useCurrentEditorPart<T>(
  reducer: (state: DeviceClassDocument) => T,
): T | undefined {
  return useCurrentDocumentPart(documentTypes.DEVICE_CLASS, reducer);
}

export function useCurrentEditorPartShallow<T>(
  reducer: (state: DeviceClassDocument) => T,
): T | undefined {
  return useCurrentDocumentPartShallow(documentTypes.DEVICE_CLASS, reducer);
}

export function useDeviceLibrary(): Library | undefined {
  return useCurrentEditorPartShallow((editor) => ({
    parameterClasses: editor.parameterClasses,
    structureClasses: editor.structureClasses,
    serializerClasses: editor.serializerClasses,
    resourceClasses: editor.resourceClasses,
    commandClasses: editor.commandClasses,
    commandClassArguments: editor.commandClassArguments,
    commandClassReturnValues: editor.commandClassReturnValues,
    enumChoices: editor.enumChoices,
    localizations: editor.localizations,
  }));
}

export function useLibraries(): Record<string, string> | undefined {
  return useCurrentEditorPart((state) => state.libraries);
}

/** The locale the current document was authored in. */
export function useSourceLocale(): string | undefined {
  return useCurrentEditorPart((editor) => editor.sourceLocale);
}

export function useLocalizations(): Record<LocalizationKey, Localization> {
  return useCurrentEditorPart((state) => state.localizations) || {};
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function updateCurrentEditor(
  updater: (editor: Draft<DeviceClassDocument>) => void,
) {
  updateCurrentDocumentOfType(documentTypes.DEVICE_CLASS, updater);
}

export function setWindowLayout(
  documentId: EntityId,
  model: FlexLayout.IJsonModel,
) {
  setDocumentLayout(documentId, JSON.stringify(model.layout));
}

export function addEnumChoice(
  parent: EnumChoiceParent,
  codexId: CodexId,
  name: string,
  description: string | undefined,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    if (!getParentLocIdPrefix(editor, parent)) {
      return;
    }

    const allChoices = select(editor.enumChoices, (choice) =>
      enumChoiceParentsEqual(parent, choice.parent),
    );

    if (allChoices.some((choice) => choice.codexId === codexId)) {
      return;
    }

    const newChoiceId = newEntityId();
    const choice = { parent, codexId, index: allChoices.length };

    editor.enumChoices[newChoiceId] = {
      ...choice,
      localized: createDeviceClassLocalizations(
        editor,
        "enumChoices",
        newChoiceId,
        choice,
        { name, description },
        locale,
      ),
    };
  });
}

export function modifyEnumChoice(
  id: EntityId,
  recipe: (
    state: Draft<Omit<Unlocalized<EnumChoice>, "parentType" | "parentId">>,
  ) => void,
) {
  updateCurrentEditor((editor) => {
    const choice = editor.enumChoices[id];
    if (!choice) {
      return;
    }

    recipe(choice);
  });
}

export function modifyEnumChoiceLocalizedValue(
  id: EntityId,
  key: keyof EnumChoice["localized"],
  newValue: string,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    setDeviceClassLocalizedValue(
      editor,
      { table: "enumChoices", entityId: id, field: key },
      newValue,
      locale,
    );
  });
}

export function deleteEnumChoice(id: EntityId) {
  updateCurrentEditor((editor) => {
    const choiceToRemove = editor.enumChoices[id];
    if (!choiceToRemove) {
      return;
    }

    // Renumber indexes of remaining choices
    const allChoices = selectWithIds(editor.enumChoices, (choice) =>
      enumChoiceParentsEqual(choice.parent, choiceToRemove.parent),
    );
    allChoices.sort((e1, e2) => e1.index - e2.index);
    allChoices
      .filter((choice) => choice.id !== id)
      .forEach((choice, index) => {
        editor.enumChoices[choice.id].index = index;
      });

    removeDeviceClassLocalizations(editor, [
      { table: "enumChoices", entityId: id },
    ]);

    delete editor.enumChoices[id];
  });
}

export function getCurrentEditor(
  state: AppPersistentState,
): DeviceClassDocument | undefined {
  return getCurrentDocumentOfType(state, documentTypes.DEVICE_CLASS);
}

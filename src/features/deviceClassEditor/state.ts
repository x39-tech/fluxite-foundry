import { useMemo } from "react";
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
import { Library } from "codex/library";
import { LocalLibrary } from "components/ItemClassSelector";
import {
  addEnumChoiceTo,
  deleteEnumChoiceFrom,
  modifyEnumChoiceIn,
} from "features/classEditors/enumChoiceOperations";
import {
  deviceClassLocalizer,
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

/** The device class's own classes, as the item class selector wants them. */
export function useDeviceLocalLibrary(): LocalLibrary | undefined {
  const library = useDeviceLibrary();
  return useMemo(
    () => (library ? { name: "This Device Class", library } : undefined),
    [library],
  );
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

/** A device class document as it is handed to an updater, ready to change. */
export type DeviceClassDraft = Draft<DeviceClassDocument>;

/**
 * Updates the current document, if it is a device class.
 *
 * The label names the change in the undo menu; see updateCurrentDocumentOfType.
 */
export function updateCurrentEditor(
  label: string,
  updater: (editor: DeviceClassDraft) => void,
) {
  updateCurrentDocumentOfType(documentTypes.DEVICE_CLASS, label, updater);
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
  updateCurrentEditor("Add Enum Choice", (editor) => {
    addEnumChoiceTo(
      editor,
      deviceClassLocalizer(editor),
      parent,
      codexId,
      name,
      description,
      locale,
    );
  });
}

export function modifyEnumChoice(
  id: EntityId,
  recipe: (state: Draft<Omit<Unlocalized<EnumChoice>, "parent">>) => void,
) {
  updateCurrentEditor("Edit Enum Choice", (editor) => {
    modifyEnumChoiceIn(editor, id, recipe);
  });
}

export function modifyEnumChoiceLocalizedValue(
  id: EntityId,
  key: keyof EnumChoice["localized"],
  newValue: string,
  locale: string,
) {
  updateCurrentEditor("Edit Enum Choice", (editor) => {
    setDeviceClassLocalizedValue(
      editor,
      { table: "enumChoices", entityId: id, field: key },
      newValue,
      locale,
    );
  });
}

export function deleteEnumChoice(id: EntityId) {
  updateCurrentEditor("Delete Enum Choice", (editor) => {
    deleteEnumChoiceFrom(editor, deviceClassLocalizer(editor), id);
  });
}

export function getCurrentEditor(
  state: AppPersistentState,
): DeviceClassDocument | undefined {
  return getCurrentDocumentOfType(state, documentTypes.DEVICE_CLASS);
}

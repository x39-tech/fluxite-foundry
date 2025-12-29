import { Draft, produceWithPatches } from "immer";
import * as FlexLayout from "flexlayout-react";
import { useShallow } from "zustand/react/shallow";
import { createParameterDatabase, Error as E173Error } from "e173";
import {
  AppPersistentState,
  CodexId,
  DeviceClassEditorState,
  EntityId,
  EnumChoice,
  EnumChoiceParent,
  Localization,
  LocalizationDbSchema,
  LocalizationKey,
  LocalizationReferencedItem,
  Parameter,
  Unlocalized,
} from "app/persistentState";
import {
  useAppPersistentStore,
  updateAppPersistentState,
  useCodexDatabase,
  useCurrentLocale,
  updateAppRuntimeState,
} from "app/store";
import { getUniqueItemId } from "utils/utils";
import {
  lookupDeviceParameterClass,
  lookupParameterClass,
  ResolvedParameterClass,
} from "./stateTransformations";
import {
  enumChoiceParentsEqual,
  newEntityId,
  select,
  selectWithIds,
} from "app/stateUtils";
import { exportDeviceClass } from "./export";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useCurrentEditorId(): string | undefined {
  return useAppPersistentStore(
    (state) => state.openEditors.editors[state.openEditors.selectedEditor]?.id,
  );
}

export function useCurrentEditorPart<T>(
  reducer: (state: DeviceClassEditorState) => T,
): T | undefined {
  return useAppPersistentStore((state) => {
    const currentEditor = getCurrentEditor(state);
    if (!currentEditor) {
      return undefined;
    }

    return reducer(currentEditor);
  });
}

export function useCurrentEditorPartShallow<T>(
  reducer: (state: DeviceClassEditorState) => T,
): T | undefined {
  return useAppPersistentStore(
    useShallow((state) => {
      const currentEditor = getCurrentEditor(state);
      if (!currentEditor) {
        return undefined;
      }

      return reducer(currentEditor);
    }),
  );
}

export function useLibraries(): Record<string, string> | undefined {
  return useCurrentEditorPart((state) => state.libraries);
}

export interface ResolvedParameter {
  param: Parameter;
  paramClass: ResolvedParameterClass;
}

export function useParametersWithClasses(): Record<CodexId, ResolvedParameter> {
  const editorPart = useCurrentEditorPartShallow((editor) => {
    return [
      editor.parameters,
      editor.libraries,
      editor.parameterClasses,
      editor.enumChoices,
      editor.localizations,
    ] as const;
  });

  if (!editorPart) return {};

  const [
    parameters,
    libraries,
    deviceParamClasses,
    enumChoices,
    localizations,
  ] = editorPart;
  const locale = useCurrentLocale();
  const database = useCodexDatabase();

  return Object.values(parameters).reduce(
    (acc, param) => {
      let paramClass = undefined;

      if (param.class.type === "imported") {
        const libraryVersion = libraries[param.class.library];
        if (!libraryVersion) {
          return acc;
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

      if (paramClass) {
        acc[param.codexId] = {
          param,
          paramClass,
        };
      }

      return acc;
    },
    {} as Record<string, ResolvedParameter>,
  );
}

export function useLocalizations(): Record<LocalizationKey, Localization> {
  return useCurrentEditorPart((state) => state.localizations) || {};
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function updateCurrentEditor(
  updater: (editor: Draft<DeviceClassEditorState>) => void,
) {
  updateAppPersistentState((state) => {
    const [nextState, patches, _invPatches] = produceWithPatches(
      state,
      (state) => {
        const currentEditor = getCurrentEditor(state);
        if (!currentEditor) {
          return state;
        }

        updater(currentEditor);
      },
    );

    if (
      patches.some((patch) => {
        if (
          patch.path.length >= 3 &&
          patch.path[0] == "deviceClassEditors" &&
          typeof patch.path[2] == "string"
        ) {
          return ["libraries", "deviceLibrary", "parameters", "dmx"].includes(
            patch.path[2],
          );
        }
      })
    ) {
      updateDmxController(getCurrentEditor(nextState)!);
    }

    return nextState;
  });
}

export function setWindowLayout(model: FlexLayout.IJsonModel) {
  updateCurrentEditor(
    (editor) => (editor.windowLayout = JSON.stringify(model.layout)),
  );
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function updateDmxController(editor: DeviceClassEditorState) {
  if (editor.dmxSerializer) {
    try {
      const deviceClass = exportDeviceClass(editor);
      const db = createParameterDatabase(deviceClass);
      updateAppRuntimeState((state) => {
        state.dmxController = {
          state: "available",
          db,
        };
      });
    } catch (e) {
      const err = e as E173Error;
      updateAppRuntimeState((state) => {
        state.dmxController = {
          state: "error",
          error: err,
        };
      });
    }
  }
}

function getParentLocIdPrefix(
  editor: Draft<DeviceClassEditorState>,
  parent: EnumChoiceParent,
): string | undefined {
  switch (parent.type) {
    case "paramAdditional": {
      const codexId = editor.parameters[parent.id]?.codexId;
      return codexId ? `param_${codexId}` : undefined;
    }
    case "paramClass": {
      const codexId = editor.parameterClasses[parent.id]?.codexId;
      return codexId ? `paramClass_${codexId}` : undefined;
    }
    case "cmdClassArg": {
      const arg = editor.commandClassArguments[parent.id];
      const ccCodexId = editor.commandClasses[arg.parentId]?.codexId;
      if (!arg || !ccCodexId) {
        return undefined;
      }
      return `commandClass_${ccCodexId}_arg_${arg.codexId}`;
    }
    case "cmdClassRet": {
      const arg = editor.commandClassArguments[parent.id];
      const ccCodexId = editor.commandClasses[arg.parentId]?.codexId;
      if (!arg || !ccCodexId) {
        return undefined;
      }
      return `commandClass_${ccCodexId}_return_${arg.codexId}`;
    }
    case "cmdArg": {
      const cmdCodexId = editor.commands[parent.cmdId].codexId;
      const argCodexId =
        parent.idType === "local"
          ? editor.commandClassArguments[parent.id].codexId
          : parent.id;

      if (!cmdCodexId || !argCodexId) {
        return undefined;
      }
      return `command_${cmdCodexId}_arg_${argCodexId}`;
    }
    case "cmdRet": {
      const cmdCodexId = editor.commands[parent.cmdId].codexId;
      const retCodexId =
        parent.idType === "local"
          ? editor.commandClassReturnValues[parent.id].codexId
          : parent.id;

      if (!cmdCodexId || !retCodexId) {
        return undefined;
      }
      return `command_${cmdCodexId}_return_${retCodexId}`;
    }
  }
}

const ENUM_CHOICE_LOCALIZED_INFO: Record<
  keyof EnumChoice["localized"],
  {
    itemType: LocalizationReferencedItem["itemType"];
    constructKey: (prefix: string, codexId: string) => string;
  }
> = {
  name: {
    itemType: "enumName",
    constructKey: (prefix, codexId) => `${prefix}_enumChoice_${codexId}_name`,
  },
  description: {
    itemType: "enumDesc",
    constructKey: (prefix, codexId) =>
      `${prefix}_enumChoice_${codexId}_description`,
  },
};

export function addEnumChoice(
  parent: EnumChoiceParent,
  codexId: CodexId,
  name: string,
  description: string | undefined,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    const keyPrefix = getParentLocIdPrefix(editor, parent);
    if (!keyPrefix) {
      return;
    }

    const allChoices = select(editor.enumChoices, (choice) =>
      enumChoiceParentsEqual(parent, choice.parent),
    );

    if (allChoices.some((choice) => choice.codexId === codexId)) {
      return;
    }

    const newChoiceId = newEntityId();

    const nameKey = addNewItemLocalization(
      editor,
      ENUM_CHOICE_LOCALIZED_INFO["name"].constructKey(keyPrefix, codexId),
      {
        itemId: newChoiceId,
        itemType: ENUM_CHOICE_LOCALIZED_INFO["name"].itemType,
      },
      locale,
      name,
    );

    const descKey = description
      ? addNewItemLocalization(
          editor,
          ENUM_CHOICE_LOCALIZED_INFO["description"].constructKey(
            keyPrefix,
            codexId,
          ),
          {
            itemId: newChoiceId,
            itemType: ENUM_CHOICE_LOCALIZED_INFO["description"].itemType,
          },
          locale,
          description,
        )
      : undefined;

    editor.enumChoices[newChoiceId] = {
      parent,
      codexId,
      index: allChoices.length,
      localized: {
        name: nameKey,
        description: descKey,
      },
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
    const enumChoice = editor.enumChoices[id];
    if (!enumChoice) {
      return;
    }

    const keyPrefix = getParentLocIdPrefix(editor, enumChoice.parent);
    if (!keyPrefix) {
      return;
    }

    const localization = enumChoice.localized[key]
      ? editor.localizations[enumChoice.localized[key]]
      : undefined;

    const info = ENUM_CHOICE_LOCALIZED_INFO[key];

    if (!localization) {
      const locKey = addNewItemLocalization(
        editor,
        info.constructKey(keyPrefix, enumChoice.codexId),
        {
          itemId: id,
          itemType: info.itemType,
        },
        locale,
        newValue,
      );
      enumChoice.localized[key] = locKey;
    } else {
      localization.strings[locale] = newValue;
    }
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

    removeReferencedLocalization(editor, choiceToRemove.localized.name, {
      itemType: "enumName",
      itemId: id,
    });
    removeReferencedLocalization(editor, choiceToRemove.localized.description, {
      itemType: "enumDesc",
      itemId: id,
    });

    delete editor.enumChoices[id];
  });
}

export function getCurrentEditor<S extends AppPersistentState>(
  state: S,
): DeviceClassEditorState | undefined {
  const currentEditor =
    state.openEditors.editors[state.openEditors.selectedEditor];
  if (!currentEditor || currentEditor.type != "deviceClass") {
    return undefined;
  }
  return state.deviceClassEditors[currentEditor.id];
}

export function addNewItemLocalization(
  editor: Draft<DeviceClassEditorState>,
  desiredKey: string,
  referencedItem: LocalizationReferencedItem,
  locale: string,
  initialValue: string,
): LocalizationKey {
  const key = LocalizationKey(
    getUniqueItemId(Object.keys(editor.localizations), desiredKey),
  );

  editor.localizations[key] = {
    strings: LocalizationDbSchema.parse({
      [locale]: initialValue,
    }),
    items: [referencedItem],
  };

  return key;
}

export function removeReferencedLocalization(
  editor: Draft<DeviceClassEditorState>,
  key: LocalizationKey | undefined,
  referencedItem: LocalizationReferencedItem,
) {
  const loc = key ? editor.localizations[key] : undefined;
  if (loc) {
    const newItems = loc.items.filter(
      (item) =>
        item.itemType !== referencedItem.itemType ||
        ("itemId" in item &&
          "itemId" in referencedItem &&
          item.itemId !== referencedItem.itemId),
    );
    if (newItems.length === 0) {
      delete editor.localizations[key!];
    } else {
      loc.items = newItems;
    }
  }
}

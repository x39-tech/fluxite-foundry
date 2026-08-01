import { Draft, produceWithPatches } from "immer";
import * as FlexLayout from "flexlayout-react";
import { useShallow } from "zustand/react/shallow";
import { DmxDriver, DelverError } from "@cpwg-community/delver";
import {
  AppPersistentState,
  CodexId,
  DeviceClassEditorState,
  EntityId,
  EnumChoice,
  EnumChoiceParent,
  Localization,
  LocalizationKey,
} from "app/persistentState";
import { Unlocalized } from "features/localizations/types";
import {
  useAppPersistentStore,
  updateAppPersistentState,
  updateAppRuntimeState,
} from "app/store";
import {
  enumChoiceParentsEqual,
  newEntityId,
  select,
  selectWithIds,
} from "app/stateUtils";
import { Library } from "codex/library";
import { exportDeviceClass } from "./export";
import {
  createDeviceClassLocalizations,
  getParentLocIdPrefix,
  removeDeviceClassLocalizations,
  setDeviceClassLocalizedValue,
} from "./localizationRegistry";

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
          return [
            "libraries",
            "parameterClasses",
            "commandClasses",
            "parameters",
            "commands",
            "commandClassArguments",
            "commandClassReturnValues",
            "enumChoices",
            "dmxSerializer",
          ].includes(patch.path[2]);
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
      const driver = new DmxDriver(deviceClass, "dmx");
      updateAppRuntimeState((state) => {
        state.dmxController = {
          state: "available",
          driver,
        };
      });
    } catch (e) {
      const err = e as DelverError;
      updateAppRuntimeState((state) => {
        state.dmxController = {
          state: "error",
          error: err,
        };
      });
    }
  }
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

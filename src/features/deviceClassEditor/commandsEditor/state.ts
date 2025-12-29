// import { nanoid } from "nanoid";
import { Draft } from "immer";
import { useCurrentLocale, useCodexDatabase } from "app/store";
import {
  ClassReference,
  CodexId,
  Command,
  CommandArgument,
  CommandClass,
  CommandReturnValue,
  EntityId,
  EnumChoice,
  Localization,
  LocalizationKey,
  LocalizationReferencedItem,
  Unlocalized,
} from "app/persistentState";
import { localize, LocalizedString } from "utils/localizationUtils";
import {
  addNewItemLocalization,
  removeReferencedLocalization,
  updateCurrentEditor,
  useCurrentEditorPartShallow,
} from "../state";
import {
  LocalizedInstanceEnumChoice,
  lookupCommandClass,
  lookupDeviceCommandClass,
  ResolvedCommandClass,
} from "../stateTransformations";
import { ItemEditor } from "utils/utils";
import { getWithId, newEntityId, selectWithIds } from "app/stateUtils";

export interface LocalizedCommand extends Unlocalized<Command> {
  friendlyName?: LocalizedString;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useCommandCodexIds(): string[] {
  const ids = useCurrentEditorPartShallow((state) =>
    Object.values(state.commands).map((param) => param.codexId),
  );
  return ids ?? [];
}

export function useCommandEditors(): ItemEditor[] {
  const editorIds =
    useCurrentEditorPartShallow((state) => state.commandEditors) || [];
  const codexIds =
    useCurrentEditorPartShallow((state) =>
      editorIds.map((id) =>
        state.commands[id] ? state.commands[id].codexId : null,
      ),
    ) || [];

  return editorIds.reduce<ItemEditor[]>((acc, id, index) => {
    if (codexIds[index]) {
      acc.push({
        id,
        codexId: codexIds[index],
      });
    }
    return acc;
  }, []);
}

export function useCommandInfo(id: EntityId):
  | {
      command: LocalizedCommand;
      commandClass?: ResolvedCommandClass;
      instanceArgEnumChoices: Record<CodexId, LocalizedInstanceEnumChoice[]>;
      instanceReturnEnumChoices: Record<CodexId, LocalizedInstanceEnumChoice[]>;
    }
  | undefined {
  const editorPart = useCurrentEditorPartShallow((editor) => {
    return [
      editor.commands[id],
      editor.libraries,
      editor.commandClasses,
      editor.commandClassArguments,
      editor.commandClassReturnValues,
      editor.enumChoices,
      editor.localizations,
    ] as const;
  });
  const locale = useCurrentLocale();
  const database = useCodexDatabase();

  if (!editorPart) return undefined;

  const [
    command,
    libraries,
    commandClasses,
    commandClassArguments,
    commandClassReturnValues,
    enumChoices,
    localizations,
  ] = editorPart;

  if (!command) return undefined;

  const cmdClass = resolveCommandClass(
    command,
    libraries,
    commandClasses,
    commandClassArguments,
    commandClassReturnValues,
    enumChoices,
    localizations,
    database,
    locale,
  );

  const friendlyName = command.localized.friendlyName
    ? localize(localizations, command.localized.friendlyName, locale)
    : undefined;

  const localizedCommand: LocalizedCommand = {
    ...command,
    friendlyName,
  };

  const instanceArgEnumChoices = collectInstanceEnumChoices(
    enumChoices,
    localizations,
    locale,
    id,
    "cmdArg",
    commandClassArguments,
  );

  const instanceReturnEnumChoices = collectInstanceEnumChoices(
    enumChoices,
    localizations,
    locale,
    id,
    "cmdRet",
    commandClassReturnValues,
  );

  return {
    command: localizedCommand,
    commandClass: cmdClass,
    instanceArgEnumChoices,
    instanceReturnEnumChoices,
  };
}

function resolveCommandClass(
  command: Command,
  libraries: Record<string, string>,
  commandClasses: Record<EntityId, CommandClass>,
  commandClassArguments: Record<EntityId, CommandArgument>,
  commandClassReturnValues: Record<EntityId, CommandReturnValue>,
  enumChoices: Record<EntityId, EnumChoice>,
  localizations: Record<LocalizationKey, Localization>,
  database: ReturnType<typeof useCodexDatabase>,
  locale: string,
): ResolvedCommandClass | undefined {
  if (command.class.type === "imported") {
    const libraryVersion = libraries[command.class.library];
    if (!libraryVersion) return undefined;

    return lookupCommandClass(
      database,
      command.class.codexId,
      command.class.library,
      libraryVersion,
      locale,
    );
  }

  return lookupDeviceCommandClass(
    commandClasses,
    commandClassArguments,
    commandClassReturnValues,
    enumChoices,
    localizations,
    command.class.id,
    locale,
  );
}

type CmdEnumParentType = "cmdArg" | "cmdRet";
type CmdEnumParent = Extract<EnumChoice["parent"], { type: CmdEnumParentType }>;

function collectInstanceEnumChoices(
  enumChoices: Record<EntityId, EnumChoice>,
  localizations: Record<LocalizationKey, Localization>,
  locale: string,
  commandId: EntityId,
  parentType: CmdEnumParentType,
  classItems: Record<EntityId, { codexId: CodexId }>,
): Record<CodexId, LocalizedInstanceEnumChoice[]> {
  const choices = selectWithIds(
    enumChoices,
    (choice) =>
      choice.parent.type === parentType && choice.parent.cmdId === commandId,
  );

  const grouped: Record<CodexId, LocalizedInstanceEnumChoice[]> = {};

  for (const choice of choices) {
    const parent = choice.parent as CmdEnumParent;
    const codexId =
      parent.idType === "imported" ? parent.id : classItems[parent.id]?.codexId;
    if (!codexId) continue;

    if (!grouped[codexId]) {
      grouped[codexId] = [];
    }

    grouped[codexId].push({
      ...choice,
      name: localize(localizations, choice.localized.name, locale),
      description: choice.localized.description
        ? localize(localizations, choice.localized.description, locale)
        : undefined,
    });
  }

  // Sort each group by index
  for (const group of Object.values(grouped)) {
    group.sort((a, b) => a.index - b.index);
  }

  return grouped;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function createNewCommand(
  library: string | undefined,
  cmdClass: CodexId,
  codexId: CodexId,
  friendlyName: string,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    if (Object.values(editor.commands).some((cmd) => cmd.codexId === codexId)) {
      return;
    }

    let classRef: ClassReference;
    if (library === undefined) {
      const pc = getWithId(
        editor.commandClasses,
        (cls) => cls.codexId === cmdClass,
      );
      if (!pc) {
        return;
      }
      classRef = { type: "local", codexId: pc.codexId, id: pc.id };
    } else {
      classRef = { type: "imported", codexId: cmdClass, library };
    }

    const cmdId = newEntityId();

    const nameKey = addNewItemLocalization(
      editor,
      `command_${codexId}`,
      {
        itemId: cmdId,
        itemType: "cmdName",
      },
      locale,
      friendlyName,
    );

    editor.commands[cmdId] = {
      codexId,
      localized: {
        friendlyName: nameKey,
      },
      class: classRef,
      completionNotification: false,
    };

    editor.commandEditors.push(cmdId);
  });
}

export function modifyCommand(
  id: EntityId,
  recipe: (state: Draft<Command>) => void,
) {
  updateCurrentEditor((editor) => {
    const command = editor.commands[id];
    if (!command) {
      return;
    }

    recipe(command);
  });
}

const COMMAND_LOCALIZED_INFO: Record<
  keyof Command["localized"],
  {
    itemType: LocalizationReferencedItem["itemType"];
    constructKey: (codexId: string) => string;
  }
> = {
  friendlyName: {
    itemType: "cmdName",
    constructKey: (codexId) => `command_${codexId}`,
  },
};

export function modifyCommandLocalizedValue(
  id: EntityId,
  key: keyof Command["localized"],
  newValue: string,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    const command = editor.commands[id];
    if (!command) {
      return;
    }

    const localization = command.localized[key]
      ? editor.localizations[command.localized[key]]
      : undefined;

    if (!localization) {
      const info = COMMAND_LOCALIZED_INFO[key];
      const locKey = addNewItemLocalization(
        editor,
        info.constructKey(command.codexId),
        {
          itemId: id,
          itemType: info.itemType,
        },
        locale,
        newValue,
      );
      command.localized[key] = locKey;
    } else {
      localization.strings[locale] = newValue;
    }
  });
}

export function deleteCommand(id: EntityId) {
  updateCurrentEditor((editor) => {
    const command = editor.commands[id];
    if (!command) {
      return;
    }

    const enumChoices = selectWithIds(
      editor.enumChoices,
      (choice) =>
        (choice.parent.type === "cmdArg" || choice.parent.type === "cmdRet") &&
        choice.parent.cmdId === id,
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

    removeReferencedLocalization(editor, command.localized.friendlyName, {
      itemType: "cmdName",
      itemId: id,
    });

    delete editor.commands[id];
    editor.commandEditors = editor.commandEditors.filter(
      (value) => value !== id,
    );
  });
}

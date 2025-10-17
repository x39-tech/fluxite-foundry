import { nanoid } from "nanoid";
import { Draft, WritableDraft } from "immer";
import { Command } from "e173";
import { DeviceClassEditorState, ItemEditor } from "app/state";
import { useUdrDatabase } from "app/store";
import {
  LocalizedEnumChoice,
  lookupCommandClass,
  lookupDeviceCommandClass,
  ResolvedCommandClass,
} from "udr/udrDatabase";
import {
  modifyLocalizationString,
  setNewLocalizationString,
  updateCurrentEditor,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
  useDeviceLibrary,
  useDeviceLocalizations,
  useLibraries,
} from "../state";
import { collectLocalizableKeys } from "utils/localizationUtils";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useCommandIds(): string[] {
  const ids = useCurrentEditorPartShallow((state) =>
    Object.keys(state.commands.commands),
  );
  return ids ?? [];
}

export function useCommandEditors(): ItemEditor[] {
  const editors = useCurrentEditorPartShallow((state) =>
    state.commands.itemEditorLayout.filter(
      (editor) => editor.udrId in state.commands.commands,
    ),
  );
  return editors ?? [];
}

export function useCommand(id: string): Command | undefined {
  return useCurrentEditorPart((state) => state.commands.commands[id]);
}

export function useCommandClass(
  command?: Command,
): ResolvedCommandClass | undefined {
  const database = useUdrDatabase();
  const libraries = useLibraries();
  const deviceLibrary = useDeviceLibrary();
  const deviceLocalizations = useDeviceLocalizations();

  if (!command) {
    return undefined;
  }

  if (command.library) {
    const libraryVersion = libraries?.[command.library];
    if (!libraryVersion) {
      return undefined;
    }

    return lookupCommandClass(
      database,
      command.library,
      libraryVersion,
      command.class,
    );
  } else {
    return lookupDeviceCommandClass(
      deviceLibrary,
      deviceLocalizations,
      command.class,
    );
  }
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function createNewCommand(
  library: string | undefined,
  cls: string,
  id: string,
  friendlyName: string,
) {
  updateCurrentEditor((editor) => {
    const commandState = editor.commands;

    if (id in commandState.commands) {
      return;
    }

    const nameKey = setNewLocalizationString(
      editor,
      `command_${id}`,
      friendlyName,
    );

    commandState.commands[id] = {
      library,
      class: cls,
      completionNotification: false,
      "@friendlyName": nameKey,
    };

    commandState.itemEditorLayout.push({
      id: nanoid(),
      udrId: id,
    });
  });
}

export function modifyCommand(
  id: string,
  recipe: (state: Draft<Command>) => void,
) {
  updateCurrentEditor((editor) => {
    const command = editor.commands.commands[id];
    if (!command) {
      return;
    }

    recipe(command);
  });
}

export function modifyCommandFriendlyName(id: string, newName: string) {
  updateCurrentEditor((editor) => {
    const command = editor.commands.commands[id];
    if (!command) {
      return;
    }

    if (command["@friendlyName"]) {
      modifyLocalizationString(editor, command["@friendlyName"], newName);
    } else {
      const newKey = setNewLocalizationString(editor, `command_${id}`, newName);
      command["@friendlyName"] = newKey;
    }
  });
}

export enum EnumChoiceLocation {
  Argument,
  ReturnValue,
}

export function modifyCommandEnumChoice(
  id: string,
  argId: string,
  choiceIndex: number,
  updatedChoice: LocalizedEnumChoice,
  location: EnumChoiceLocation,
) {
  updateCurrentEditor((editor) => {
    const command = editor.commands.commands[id];
    if (!command) {
      return;
    }

    const additionalList = (() => {
      if (location === EnumChoiceLocation.Argument) {
        command.argumentChoices ||= {};
        command.argumentChoices[argId] ||= {
          additional: [],
        };
        command.argumentChoices[argId].additional ||= [];
        return command.argumentChoices[argId].additional;
      } else {
        command.returnChoices ||= {};
        command.returnChoices[argId] ||= {
          additional: [],
        };
        command.returnChoices[argId].additional ||= [];
        return command.returnChoices[argId].additional;
      }
    })();

    if (choiceIndex < 0) {
      // New choice
      const newKey = setNewLocalizationString(
        editor,
        `command_${id}_${argId}_${updatedChoice.id}`,
        updatedChoice.name,
      );
      additionalList.push({ id: updatedChoice.id, "@name": newKey });
    } else if (choiceIndex < additionalList.length) {
      modifyLocalizationString(
        editor,
        additionalList[choiceIndex]["@name"],
        updatedChoice.name,
      );
      additionalList[choiceIndex].id = updatedChoice.id;
    }
  });
}

export function removeCommandEnumChoice(
  id: string,
  argId: string,
  choiceIndex: number,
  location: EnumChoiceLocation,
) {
  updateCurrentEditor((editor) => {
    const command = editor.commands.commands[id];
    if (!command) {
      return;
    }

    const additionalList =
      location === EnumChoiceLocation.Argument
        ? command.argumentChoices?.[argId].additional
        : command.returnChoices?.[argId].additional;

    if (!additionalList) {
      return;
    }

    const existingChoice = additionalList[choiceIndex];
    if (!existingChoice) {
      return;
    }

    delete editor.localizations["en-US"]?.strings?.[existingChoice["@name"]];
    additionalList.splice(choiceIndex, 1);
  });
}

export function changeCommandId(id: string, newId: string) {
  // TODO update localization keys
  updateCurrentEditor((editor) => {
    const commandState = editor.commands;
    if (newId in commandState.commands) {
      return;
    }

    const existingCommand = commandState.commands[id];
    if (!existingCommand) {
      return;
    }

    // Update UDR
    commandState.commands[newId] = existingCommand;
    delete commandState.commands[id];

    // Update UI commandState
    commandState.itemEditorLayout.forEach((editor) => {
      if (editor.udrId === id) {
        editor.udrId = newId;
      }
    });
  });
}

export function deleteCommand(id: string) {
  updateCurrentEditor((editor) => {
    const commandsState = editor.commands;
    deleteLocalizationStrings(editor, commandsState.commands[id]);
    delete commandsState.commands[id];
    commandsState.itemEditorLayout = commandsState.itemEditorLayout.filter(
      (value) => value.udrId !== id,
    );
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function deleteLocalizationStrings(
  editor: WritableDraft<DeviceClassEditorState>,
  command: Command,
) {
  // Collect all localization keys used by this command
  const keysToDelete = collectLocalizableKeys(command);

  // Collect all localization keys used elsewhere in the editor
  const keysInUse = new Set<string>();
  collectLocalizableKeys(editor.basicData, keysInUse);
  collectLocalizableKeys(editor.parameters.parameters, keysInUse);
  collectLocalizableKeys(editor.structures.structures, keysInUse);
  collectLocalizableKeys(editor.resources.resources, keysInUse);

  // Check all commands except the one being deleted
  for (const cmd of Object.values(editor.commands.commands)) {
    if (cmd !== command) {
      collectLocalizableKeys(cmd, keysInUse);
    }
  }

  // Delete keys that are not in use elsewhere
  for (const locale in editor.localizations) {
    const strings = editor.localizations[locale]?.strings;
    if (strings) {
      for (const key of keysToDelete) {
        if (!keysInUse.has(key)) {
          delete strings[key];
        }
      }
    }
  }
}

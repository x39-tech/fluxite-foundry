import { Draft } from "immer";
import { useCurrentLocale, useLibraryStore } from "app/store";
import {
  ClassReference,
  CodexId,
  Command,
  EntityId,
  EnumChoice,
  LocalizationKey,
} from "app/persistentState";
import { localize, LocalizedString } from "features/localizations/localize";
import { LocalizationStrings, Unlocalized } from "features/localizations/types";
import {
  updateCurrentEditor,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
  useDeviceLibrary,
  useLibraries,
  useSourceLocale,
} from "../state";
import {
  createDeviceClassLocalizations,
  removeDeviceClassLocalizations,
  setDeviceClassLocalizedValue,
} from "../localizationRegistry";
import {
  LocalizedInstanceEnumChoice,
  lookupCommandClass,
  ResolvedCommandClass,
} from "../stateTransformations";
import { resolveClassRef, resolveMemberId } from "../classResolution";
import type { ResolvedClassRef } from "../classResolution";
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
  const deviceLibrary = useDeviceLibrary();
  const importedLibs = useLibraries();
  const command = useCurrentEditorPart((editor) => editor.commands[id]);
  const locale = useCurrentLocale();
  const sourceLocale = useSourceLocale();
  const libraryStore = useLibraryStore();

  if (!deviceLibrary || !importedLibs || !command) return undefined;

  const { enumChoices, localizations } = deviceLibrary;

  const resolved = resolveClassRef(
    command.class,
    importedLibs,
    deviceLibrary,
    libraryStore,
    "commandClasses",
  );
  const cmdClass = resolved
    ? lookupCommandClass(resolved, locale, sourceLocale)
    : undefined;

  const friendlyName = command.localized.friendlyName
    ? localize(
        localizations,
        command.localized.friendlyName,
        locale,
        sourceLocale,
      )
    : undefined;

  const localizedCommand: LocalizedCommand = {
    ...command,
    friendlyName,
  };

  const instanceArgEnumChoices = collectInstanceEnumChoices(
    enumChoices,
    localizations,
    locale,
    sourceLocale,
    id,
    "cmdArg",
    resolved,
  );

  const instanceReturnEnumChoices = collectInstanceEnumChoices(
    enumChoices,
    localizations,
    locale,
    sourceLocale,
    id,
    "cmdRet",
    resolved,
  );

  return {
    command: localizedCommand,
    commandClass: cmdClass,
    instanceArgEnumChoices,
    instanceReturnEnumChoices,
  };
}

type CmdEnumParentType = "cmdArg" | "cmdRet";
type CmdEnumParent = Extract<EnumChoice["parent"], { type: CmdEnumParentType }>;

function collectInstanceEnumChoices(
  enumChoices: Record<EntityId, EnumChoice>,
  localizations: Record<LocalizationKey, LocalizationStrings>,
  locale: string,
  sourceLocale: string | undefined,
  commandId: EntityId,
  parentType: CmdEnumParentType,
  resolved: ResolvedClassRef | undefined,
): Record<CodexId, LocalizedInstanceEnumChoice[]> {
  const choices = selectWithIds(
    enumChoices,
    (choice) =>
      choice.parent.type === parentType && choice.parent.cmdId === commandId,
  );

  const grouped: Record<CodexId, LocalizedInstanceEnumChoice[]> = {};
  if (!resolved) return grouped;

  const memberKind =
    parentType === "cmdArg" ? "commandArguments" : "commandReturnValues";
  const classItems =
    parentType === "cmdArg"
      ? resolved.library.commandClassArguments
      : resolved.library.commandClassReturnValues;

  for (const choice of choices) {
    const parent = choice.parent as CmdEnumParent;
    const memberId = resolveMemberId(
      resolved,
      memberKind,
      resolved.classId,
      parent.id,
    );
    const codexId = memberId ? classItems[memberId]?.codexId : undefined;
    if (!codexId) continue;

    if (!grouped[codexId]) {
      grouped[codexId] = [];
    }

    grouped[codexId].push({
      ...choice,
      name: localize(
        localizations,
        choice.localized.name,
        locale,
        sourceLocale,
      ),
      description: choice.localized.description
        ? localize(
            localizations,
            choice.localized.description,
            locale,
            sourceLocale,
          )
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
      classRef = { type: "local", id: pc.id };
    } else {
      classRef = { type: "imported", codexId: cmdClass, library };
    }

    const cmdId = newEntityId();
    const command = {
      codexId,
      class: classRef,
      completionNotification: false,
    };

    editor.commands[cmdId] = {
      ...command,
      localized: createDeviceClassLocalizations(
        editor,
        "commands",
        { friendlyName },
        locale,
      ),
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

export function modifyCommandLocalizedValue(
  id: EntityId,
  key: keyof Command["localized"],
  newValue: string,
  locale: string,
) {
  updateCurrentEditor((editor) => {
    setDeviceClassLocalizedValue(
      editor,
      { table: "commands", entityId: id, field: key },
      newValue,
      locale,
    );
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

    removeDeviceClassLocalizations(editor, [
      { table: "commands", entityId: id },
      ...enumChoices.map((choice) => ({
        table: "enumChoices" as const,
        entityId: choice.id,
      })),
    ]);

    for (const choice of enumChoices) {
      delete editor.enumChoices[choice.id];
    }

    delete editor.commands[id];
    editor.commandEditors = editor.commandEditors.filter(
      (value) => value !== id,
    );
  });
}

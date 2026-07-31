import * as V3 from "../v3/state";
import * as V4 from "./state";

// v3 -> v4: move cross-references from CodexId to EntityId
//
// In v3, entities that needed to reference parameters, commands, and class
// members (enum choices, command arguments) did so using their user-facing
// CodexId. Renaming a target silently broke every reference to it. v4
// references local entities by their stable EntityId instead.
//
// This migration resolves each old CodexId reference to the EntityId of its
// target by reverse-looking-up the relevant table. Two cases need care:
//
//   - Unresolvable references (the target's CodexId matches nothing, i.e. the
//     reference was already dangling in the saved state) keep the CodexId
//     string verbatim, reinterpreted as an EntityId. It still resolves to
//     nothing, and the string stays available for display and for export.
//
//   - Class-member references (enum-choice exclusions, command-argument keys)
//     are only local when the owning class is local. When the class is
//     imported, the member lives in the library and keeps its CodexId.

function unresolvedEntityId(codexId: string): V4.EntityId {
  return V4.EntityId(codexId);
}

function buildCodexToEntity(
  table: Record<string, { codexId: V3.CodexId }>,
): Map<string, V4.EntityId> {
  const map = new Map<string, V4.EntityId>();
  for (const [id, entity] of Object.entries(table)) {
    // First writer wins; duplicate CodexIds are already an invalid state and
    // there is no better choice to make here.
    if (!map.has(entity.codexId)) {
      map.set(entity.codexId, V4.EntityId(id));
    }
  }
  return map;
}

function migrateParameterReference(
  ref: V3.ParameterReference,
  paramIds: Map<string, V4.EntityId>,
): V4.ParameterReference {
  const id = paramIds.get(ref.codexId) ?? unresolvedEntityId(ref.codexId);
  return {
    id,
    ...(ref.index !== undefined ? { index: ref.index } : {}),
  };
}

// Drops the denormalized codexId from a local class reference; imported
// references are unchanged (their codexId is the library's, not a local copy).
function migrateClassReference(classRef: V3.ClassReference): V4.ClassReference {
  if (classRef.type === "local") {
    return { type: "local", id: classRef.id };
  }
  return classRef;
}

// Resolves a sub-item CodexId to an EntityId when the owning class is local, or
// keeps the CodexId when it is imported. `localIds` maps member CodexId ->
// member EntityId for the local case.
function migrateLocalOrImportedId(
  memberCodexId: string,
  classIsLocal: boolean,
  localIds: Map<string, V4.EntityId>,
): V4.LocalOrImportedId {
  if (!classIsLocal) {
    return V4.CodexId(memberCodexId);
  }
  return localIds.get(memberCodexId) ?? V4.CodexId(memberCodexId);
}

// Builds a CodexId -> EntityId map for the enum choices belonging to one
// parent (a local parameter class, or a command argument/return value).
function buildChoiceIdsForParent(
  enumChoices: Record<string, V3.EnumChoice>,
  matches: (parent: V3.EnumChoiceParent) => boolean,
): Map<string, V4.EntityId> {
  const map = new Map<string, V4.EntityId>();
  for (const [id, choice] of Object.entries(enumChoices)) {
    if (matches(choice.parent)) {
      if (!map.has(choice.codexId)) {
        map.set(choice.codexId, V4.EntityId(id));
      }
    }
  }
  return map;
}

function migrateParameter(
  param: V3.Parameter,
  enumChoices: Record<string, V3.EnumChoice>,
): V4.Parameter {
  const { enumExclusions, class: classRef, ...rest } = param;
  const migratedClass = migrateClassReference(classRef);

  if (!enumExclusions) {
    return { ...rest, class: migratedClass } as V4.Parameter;
  }

  const classIsLocal = classRef.type === "local";
  const choiceIds =
    classRef.type === "local"
      ? buildChoiceIdsForParent(
          enumChoices,
          (parent) => parent.type === "paramClass" && parent.id === classRef.id,
        )
      : new Map<string, V4.EntityId>();

  return {
    ...rest,
    class: migratedClass,
    enumExclusions: enumExclusions.map((codexId) =>
      migrateLocalOrImportedId(codexId, classIsLocal, choiceIds),
    ),
  } as V4.Parameter;
}

// Migrates one of a command's exclusion maps (argEnumExclusions or
// returnEnumExclusions). Keys are argument/return CodexIds; values are excluded
// choice CodexIds. Both are local iff the command's class is local.
function migrateCommandExclusions(
  exclusions: Record<string, V3.CodexId[]>,
  classIsLocal: boolean,
  argIds: Map<string, V4.EntityId>,
  choiceIdsByArgId: Map<string, Map<string, V4.EntityId>>,
): Record<string, V4.LocalOrImportedId[]> {
  const result: Record<string, V4.LocalOrImportedId[]> = {};

  for (const [argCodexId, excludedChoiceIds] of Object.entries(exclusions)) {
    const argKey = migrateLocalOrImportedId(argCodexId, classIsLocal, argIds);
    const argEntityId = classIsLocal ? argIds.get(argCodexId) : undefined;
    const choiceIds =
      argEntityId !== undefined
        ? (choiceIdsByArgId.get(argEntityId) ?? new Map())
        : new Map<string, V4.EntityId>();

    result[argKey] = excludedChoiceIds.map((choiceCodexId) =>
      migrateLocalOrImportedId(choiceCodexId, classIsLocal, choiceIds),
    );
  }

  return result;
}

function migrateCommand(
  cmd: V3.Command,
  commandClassArguments: Record<string, V3.CommandArgument>,
  commandClassReturnValues: Record<string, V3.CommandReturnValue>,
  enumChoices: Record<string, V3.EnumChoice>,
): V4.Command {
  const classIsLocal = cmd.class.type === "local";
  const classId = classIsLocal
    ? (cmd.class as { id: V3.EntityId }).id
    : undefined;

  // arg/return CodexId -> arg/return EntityId, for the local case.
  const argIds = new Map<string, V4.EntityId>();
  const returnIds = new Map<string, V4.EntityId>();
  // arg/return EntityId -> (choice CodexId -> choice EntityId).
  const choiceIdsByArgId = new Map<string, Map<string, V4.EntityId>>();
  const choiceIdsByReturnId = new Map<string, Map<string, V4.EntityId>>();

  if (classId !== undefined) {
    for (const [id, arg] of Object.entries(commandClassArguments)) {
      if (arg.parentId === classId) {
        argIds.set(arg.codexId, V4.EntityId(id));
        choiceIdsByArgId.set(
          id,
          buildChoiceIdsForParent(
            enumChoices,
            (parent) =>
              parent.type === "cmdClassArg" && parent.id === V4.EntityId(id),
          ),
        );
      }
    }
    for (const [id, ret] of Object.entries(commandClassReturnValues)) {
      if (ret.parentId === classId) {
        returnIds.set(ret.codexId, V4.EntityId(id));
        choiceIdsByReturnId.set(
          id,
          buildChoiceIdsForParent(
            enumChoices,
            (parent) =>
              parent.type === "cmdClassRet" && parent.id === V4.EntityId(id),
          ),
        );
      }
    }
  }

  const migrated: V4.Command = {
    ...cmd,
    class: migrateClassReference(cmd.class),
  } as V4.Command;

  if (cmd.argEnumExclusions) {
    migrated.argEnumExclusions = migrateCommandExclusions(
      cmd.argEnumExclusions,
      classIsLocal,
      argIds,
      choiceIdsByArgId,
    );
  }
  if (cmd.returnEnumExclusions) {
    migrated.returnEnumExclusions = migrateCommandExclusions(
      cmd.returnEnumExclusions,
      classIsLocal,
      returnIds,
      choiceIdsByReturnId,
    );
  }

  return migrated;
}

function migrateTrigger(
  trigger: V3.DmxTrigger,
  commandIds: Map<string, V4.EntityId>,
  commands: Record<string, V3.Command>,
  commandClassArguments: Record<string, V3.CommandArgument>,
): V4.DmxTrigger {
  const commandEntityId = commandIds.get(trigger.command);
  const command = commandEntityId ?? unresolvedEntityId(trigger.command);

  // Condition keys are command-argument CodexIds in the ID space of the
  // referenced command's class. Resolve to EntityIds when that class is local.
  const cmd =
    commandEntityId !== undefined ? commands[commandEntityId] : undefined;
  const classIsLocal = cmd?.class.type === "local";
  const classId = cmd && cmd.class.type === "local" ? cmd.class.id : undefined;

  const argIds = new Map<string, V4.EntityId>();
  if (classId !== undefined) {
    for (const [id, arg] of Object.entries(commandClassArguments)) {
      if (arg.parentId === classId) {
        argIds.set(arg.codexId, V4.EntityId(id));
      }
    }
  }

  return {
    command,
    mappings: trigger.mappings.map((mapping) => {
      const conditions: Record<string, V4.DmxArgumentCondition> = {};
      for (const [argCodexId, condition] of Object.entries(
        mapping.conditions,
      )) {
        const key = migrateLocalOrImportedId(argCodexId, classIsLocal, argIds);
        conditions[key] = condition;
      }
      return { ...mapping, conditions };
    }),
  };
}

function migrateDmxSerializer(
  dmx: V3.DmxSerializerState,
  paramIds: Map<string, V4.EntityId>,
  commandIds: Map<string, V4.EntityId>,
  commands: Record<string, V3.Command>,
  commandClassArguments: Record<string, V3.CommandArgument>,
): V4.DmxSerializerState {
  const mappingGroups: Record<string, V4.DmxMappingGroup> = {};

  for (const [groupId, group] of Object.entries(dmx.mappingGroups)) {
    mappingGroups[groupId] = {
      ...group,
      mappings: group.mappings.map((mapping): V4.DmxMapping => {
        const { unmappedParams, ...restMapping } = mapping;
        return {
          ...restMapping,
          mappedParam: migrateParameterReference(mapping.mappedParam, paramIds),
          ...(unmappedParams
            ? {
                unmappedParams: unmappedParams.map((up) => ({
                  ...up,
                  parameter: migrateParameterReference(up.parameter, paramIds),
                })),
              }
            : {}),
        };
      }),
      triggers: group.triggers.map((trigger) =>
        migrateTrigger(trigger, commandIds, commands, commandClassArguments),
      ),
    };
  }

  return {
    chunks: dmx.chunks,
    mappingGroups,
    conditions: dmx.conditions,
  };
}

function migrateEditor(
  editor: V3.DeviceClassEditorState,
): V4.DeviceClassEditorState {
  const paramIds = buildCodexToEntity(editor.parameters);
  const commandIds = buildCodexToEntity(editor.commands);

  const parameters: Record<string, V4.Parameter> = {};
  for (const [id, param] of Object.entries(editor.parameters)) {
    parameters[id] = migrateParameter(param, editor.enumChoices);
  }

  const commands: Record<string, V4.Command> = {};
  for (const [id, cmd] of Object.entries(editor.commands)) {
    commands[id] = migrateCommand(
      cmd,
      editor.commandClassArguments,
      editor.commandClassReturnValues,
      editor.enumChoices,
    );
  }

  const resources: Record<string, V4.Resource> = {};
  for (const [id, resource] of Object.entries(editor.resources)) {
    resources[id] = {
      ...resource,
      class: migrateClassReference(resource.class),
    };
  }

  return {
    ...editor,
    parameters,
    commands,
    resources,
    dmxSerializer: editor.dmxSerializer
      ? migrateDmxSerializer(
          editor.dmxSerializer,
          paramIds,
          commandIds,
          editor.commands,
          editor.commandClassArguments,
        )
      : undefined,
  } as V4.DeviceClassEditorState;
}

/**
 * Migrates state from V3 to V4.
 *
 * Changes:
 * - ParameterReference now references a parameter by EntityId instead of by
 *   CodexId.
 * - DmxTrigger.command is now an EntityId instead of a CodexId.
 * - Parameter.enumExclusions, Command.argEnumExclusions / returnEnumExclusions,
 *   and DmxTriggerMapping.conditions keys now hold LocalOrImportedIds:
 *   EntityIds when the owning class is local, CodexIds when it is imported.
 * - Local ClassReferences (on parameters, resources, commands) drop their
 *   denormalized codexId; a local class is referenced by EntityId alone.
 */
export function migrateV3toV4(
  state: V3.AppPersistentState,
): V4.AppPersistentState {
  const deviceClassEditors: Record<string, V4.DeviceClassEditorState> = {};

  for (const [key, editor] of Object.entries(state.deviceClassEditors)) {
    deviceClassEditors[key] = migrateEditor(editor);
  }

  return {
    ...state,
    deviceClassEditors,
  } as V4.AppPersistentState;
}

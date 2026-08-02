// Our editor states store cross-references by EntityId, but the Fluxite Codex
// format and the app's display strings use CodexIds. These helpers translate
// between the two at the import/export boundary and for display.

import {
  LocalOrImportedId,
  ClassReference,
  CodexId,
  DeviceClassDocument,
  EntityId,
  ParameterReference,
} from "app/persistentState";

// Builds codexId -> entityId over a table of entities that carry a codexId.
// First writer wins for duplicate codexIds, which are already an invalid state.
function codexToId(
  table: Record<string, { codexId: CodexId }>,
): Map<CodexId, EntityId> {
  const map = new Map<CodexId, EntityId>();
  for (const [id, entity] of Object.entries(table)) {
    if (!map.has(entity.codexId)) {
      map.set(entity.codexId, EntityId(id));
    }
  }
  return map;
}

// --- Parameter references -------------------------------------------------

// Resolves a Codex parameter reference (codexId + optional index) to a stored
// ParameterReference. An unresolvable codexId is kept verbatim so the reference
// still reads as broken downstream.
export function toEditorParameterReference(
  editor: Pick<DeviceClassDocument, "parameters">,
  codexId: CodexId,
  index?: number,
): ParameterReference {
  const id =
    codexToId(editor.parameters).get(codexId) ?? codexIdAsEntityId(codexId);
  return { id, ...(index !== undefined ? { index } : {}) };
}

// The parameter's current codexId. A reference that no longer resolves falls
// back to the raw entity ID.
export function parameterCurrentCodexId(
  editor: Pick<DeviceClassDocument, "parameters">,
  ref: ParameterReference,
): CodexId {
  return editor.parameters[ref.id]?.codexId ?? entityIdAsCodexId(ref.id);
}

// --- Command references ---------------------------------------------------

// The command's current codexId. A reference that no longer resolves falls back
// to the raw entity ID.
export function commandCurrentCodexId(
  editor: Pick<DeviceClassDocument, "commands">,
  id: EntityId,
): CodexId {
  return editor.commands[id]?.codexId ?? entityIdAsCodexId(id);
}

export function resolveCommandId(
  editor: Pick<DeviceClassDocument, "commands">,
  codexId: CodexId,
): EntityId {
  return codexToId(editor.commands).get(codexId) ?? codexIdAsEntityId(codexId);
}

// --- Class references -----------------------------------------------------

// The codexId a class reference resolves to. An imported reference carries the
// library's codexId directly. A local reference is resolved to its class
// entity's current codexId via `classTable` (the editor's parameterClasses /
// resourceClasses / commandClasses). If the local class no longer exists we
// fall back to the raw entity ID.
export function classReferenceCodexId(
  classRef: ClassReference,
  classTable: Record<string, { codexId: CodexId }>,
): CodexId {
  if (classRef.type === "imported") {
    return classRef.codexId;
  }
  return classTable[classRef.id]?.codexId ?? entityIdAsCodexId(classRef.id);
}

// --- Class-member ids -----------------------------------------------------

// codexId <-> entityId for local enum choices belonging to a parameter class
// (excludes instance-level "additional" choices, which are never the target of
// an exclusion).
function paramClassChoiceMaps(
  editor: Pick<DeviceClassDocument, "enumChoices">,
  classId: EntityId,
): {
  codexToEntity: Map<CodexId, EntityId>;
  entityToCodex: Map<EntityId, CodexId>;
} {
  const c2e = new Map<CodexId, EntityId>();
  const e2c = new Map<EntityId, CodexId>();
  for (const [id, choice] of Object.entries(editor.enumChoices)) {
    if (choice.parent.type === "paramClass" && choice.parent.id === classId) {
      if (!c2e.has(choice.codexId)) c2e.set(choice.codexId, EntityId(id));
      e2c.set(EntityId(id), choice.codexId);
    }
  }
  return { codexToEntity: c2e, entityToCodex: e2c };
}

// Translates a class-member id from Codex space into stored editor state via a
// local lookup. An undefined map means the owning class is imported, so the
// member id already lives in Codex space and passes through unchanged.
function memberToEditor(
  codexId: CodexId,
  localCodexToId: Map<CodexId, EntityId> | undefined,
): LocalOrImportedId {
  if (!localCodexToId) return codexId;
  return localCodexToId.get(codexId) ?? codexIdAsEntityId(codexId);
}

// Translates a stored class-member id back into the codexId a Codex document
// should carry. An undefined map means the owning class is imported, so the
// member is already a CodexId.
function memberToCodex(
  member: LocalOrImportedId,
  localIdToCodex: Map<EntityId, CodexId> | undefined,
): CodexId {
  if (!localIdToCodex) return member as CodexId;
  return localIdToCodex.get(member as EntityId) ?? (member as CodexId);
}

// The id used to reference a sub-item from editor state: its local EntityId
// when the parent belongs to a local class, otherwise its CodexId. This is the
// same local-vs-imported rule the resolvers above apply, expressed for callers
// (mostly UI) that already hold the member's fields rather than a lookup map.
export function localOrImportedId(
  localId: EntityId | undefined,
  codexId: CodexId,
): LocalOrImportedId {
  return localId ?? codexId;
}

// Parameter enum-choice exclusions.
export function paramExclusionsToEditor(
  editor: Pick<DeviceClassDocument, "enumChoices">,
  paramClass: ClassReference,
  excludedCodexIds: CodexId[],
): LocalOrImportedId[] {
  const maps =
    paramClass.type === "local"
      ? paramClassChoiceMaps(editor, paramClass.id)
      : undefined;
  return excludedCodexIds.map((codexId) =>
    memberToEditor(codexId, maps?.codexToEntity),
  );
}

export function paramExclusionsToCodex(
  editor: Pick<DeviceClassDocument, "enumChoices">,
  paramClass: ClassReference,
  excluded: LocalOrImportedId[],
): CodexId[] {
  const maps =
    paramClass.type === "local"
      ? paramClassChoiceMaps(editor, paramClass.id)
      : undefined;
  return excluded.map((member) => memberToCodex(member, maps?.entityToCodex));
}

// Command argument / return-value exclusions. These are keyed by an argument
// (or return value) member id, and each value is a list of excluded enum-choice
// member ids. Both the keys and the values live in the id space of the
// command's class. `kind` selects arguments vs return values, which changes
// both the entity table and the enum-choice parent type.
type CommandMemberKind = "arg" | "return";

interface CommandMemberTables {
  memberIds: Record<string, { codexId: CodexId; parentId: EntityId }>;
  choiceParentType: "cmdClassArg" | "cmdClassRet";
}

function commandMemberTables(
  editor: Pick<
    DeviceClassDocument,
    "commandClassArguments" | "commandClassReturnValues"
  >,
  kind: CommandMemberKind,
): CommandMemberTables {
  return kind === "arg"
    ? {
        memberIds: editor.commandClassArguments,
        choiceParentType: "cmdClassArg",
      }
    : {
        memberIds: editor.commandClassReturnValues,
        choiceParentType: "cmdClassRet",
      };
}

// codexId <-> entityId for the members (args or returns) of one local command
// class.
function commandMemberMaps(
  tables: CommandMemberTables,
  classId: EntityId,
): {
  codexToEntity: Map<CodexId, EntityId>;
  entityToCodex: Map<EntityId, CodexId>;
} {
  const c2e = new Map<CodexId, EntityId>();
  const e2c = new Map<EntityId, CodexId>();
  for (const [id, member] of Object.entries(tables.memberIds)) {
    if (member.parentId === classId) {
      if (!c2e.has(member.codexId)) c2e.set(member.codexId, EntityId(id));
      e2c.set(EntityId(id), member.codexId);
    }
  }
  return { codexToEntity: c2e, entityToCodex: e2c };
}

// codexId <-> entityId for the enum choices of one local command member.
function commandChoiceMaps(
  editor: Pick<DeviceClassDocument, "enumChoices">,
  choiceParentType: "cmdClassArg" | "cmdClassRet",
  memberId: EntityId,
): {
  codexToEntity: Map<CodexId, EntityId>;
  entityToCodex: Map<EntityId, CodexId>;
} {
  const c2e = new Map<CodexId, EntityId>();
  const e2c = new Map<EntityId, CodexId>();
  for (const [id, choice] of Object.entries(editor.enumChoices)) {
    if (
      choice.parent.type === choiceParentType &&
      choice.parent.id === memberId
    ) {
      if (!c2e.has(choice.codexId)) c2e.set(choice.codexId, EntityId(id));
      e2c.set(EntityId(id), choice.codexId);
    }
  }
  return { codexToEntity: c2e, entityToCodex: e2c };
}

type CommandExclusionsEditor = Pick<
  DeviceClassDocument,
  "enumChoices" | "commandClassArguments" | "commandClassReturnValues"
>;

export function commandExclusionsToEditor(
  editor: CommandExclusionsEditor,
  cmdClass: ClassReference,
  kind: CommandMemberKind,
  exclusions: Record<string, CodexId[]>,
): Record<string, LocalOrImportedId[]> {
  const tables = commandMemberTables(editor, kind);
  const memberMaps =
    cmdClass.type === "local"
      ? commandMemberMaps(tables, cmdClass.id)
      : undefined;

  const result: Record<string, LocalOrImportedId[]> = {};
  for (const [memberCodexId, choiceCodexIds] of Object.entries(exclusions)) {
    const memberKey = memberToEditor(
      memberCodexId as CodexId,
      memberMaps?.codexToEntity,
    );
    // Excluded choices live in the id space of the member, so their lookup is
    // scoped to the member's entity id (only known when the class is local).
    const memberEntityId = memberMaps?.codexToEntity.get(
      memberCodexId as CodexId,
    );
    const choiceMaps = memberEntityId
      ? commandChoiceMaps(editor, tables.choiceParentType, memberEntityId)
      : undefined;

    result[memberKey] = choiceCodexIds.map((choiceCodexId) =>
      memberToEditor(choiceCodexId, choiceMaps?.codexToEntity),
    );
  }
  return result;
}

export function commandExclusionsToCodex(
  editor: CommandExclusionsEditor,
  cmdClass: ClassReference,
  kind: CommandMemberKind,
  exclusions: Record<string, LocalOrImportedId[]>,
): Record<string, CodexId[]> {
  const tables = commandMemberTables(editor, kind);
  const memberMaps =
    cmdClass.type === "local"
      ? commandMemberMaps(tables, cmdClass.id)
      : undefined;

  const result: Record<string, CodexId[]> = {};
  for (const [memberKey, choiceMembers] of Object.entries(exclusions)) {
    const memberCodexId = memberToCodex(
      memberKey as LocalOrImportedId,
      memberMaps?.entityToCodex,
    );
    // For a local class the stored key is the member's entity id, which scopes
    // the choice lookup below.
    const memberEntityId =
      cmdClass.type === "local" ? (memberKey as EntityId) : undefined;
    const choiceMaps = memberEntityId
      ? commandChoiceMaps(editor, tables.choiceParentType, memberEntityId)
      : undefined;

    result[memberCodexId] = choiceMembers.map((member) =>
      memberToCodex(member, choiceMaps?.entityToCodex),
    );
  }
  return result;
}

// Resolves a command-argument condition key (used by DMX triggers) in either
// direction, given the command the trigger targets.
export function commandArgKeyToEditor(
  editor: CommandExclusionsEditor,
  cmdClass: ClassReference,
  argCodexId: CodexId,
): LocalOrImportedId {
  const maps =
    cmdClass.type === "local"
      ? commandMemberMaps(commandMemberTables(editor, "arg"), cmdClass.id)
      : undefined;
  return memberToEditor(argCodexId, maps?.codexToEntity);
}

export function commandArgKeyToCodex(
  editor: CommandExclusionsEditor,
  cmdClass: ClassReference,
  member: LocalOrImportedId,
): CodexId {
  const maps =
    cmdClass.type === "local"
      ? commandMemberMaps(commandMemberTables(editor, "arg"), cmdClass.id)
      : undefined;
  return memberToCodex(member, maps?.entityToCodex);
}

export function codexIdAsEntityId(codexId: string): EntityId {
  return EntityId(codexId);
}

export function entityIdAsCodexId(id: EntityId): CodexId {
  return id as unknown as CodexId;
}

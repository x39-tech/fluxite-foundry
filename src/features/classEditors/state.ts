// Reading and editing item classes in the context of the document that holds
// them.

import { useMemo } from "react";
import { Draft } from "immer";
import {
  CodexId,
  CommandArgument,
  CommandClass,
  CommandReturnValue,
  EntityId,
  EnumChoice,
  EnumChoiceParent,
  LocalizationKey,
  ParameterClass,
  ResourceClass,
  SerializerClass,
  StructureClass,
} from "app/persistentState";
import { newEntityId, select, selectWithIds } from "app/stateUtils";
import { Library } from "codex/library";
import { localize, LocalizedString } from "features/localizations/localize";
import { Unlocalized } from "features/localizations/types";
import { useCurrentLocale } from "app/store";
import { ItemEditor } from "utils/utils";
import {
  ClassDocument,
  ClassEditingApi,
  ClassKind,
  ClassLocalizedField,
  ClassLocalizer,
  classKinds,
  useClassEditing,
} from "./context";
import {
  addEnumChoiceTo,
  deleteEnumChoiceFrom,
  deleteEnumChoicesOf,
  enumChoicesOf,
  modifyEnumChoiceIn,
} from "./enumChoiceOperations";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * This takes advantage of the fact that all classes and all class sub-items
 * like command class arguments, return values, and enum choices have the same
 * pair of localized fields.
 */
interface ClassEntity {
  codexId: CodexId;
  localized: {
    name: LocalizationKey;
    description?: LocalizationKey;
  };
}

/** A class or class sub-item with its localized fields resolved for display. */
export type Localized<T extends ClassEntity> = Unlocalized<T> & {
  id: EntityId;
  name: LocalizedString;
  description?: LocalizedString;
};

export type LocalizedParameterClass = Localized<ParameterClass>;
export type LocalizedStructureClass = Localized<StructureClass>;
export type LocalizedSerializerClass = Localized<SerializerClass>;
export type LocalizedResourceClass = Localized<ResourceClass>;
export type LocalizedCommandClass = Localized<CommandClass>;

/** The two tables of parts a command class owns. */
export const commandMemberKinds = {
  ARGUMENT: "commandClassArguments",
  RETURN_VALUE: "commandClassReturnValues",
} as const;

export type CommandMemberKind =
  (typeof commandMemberKinds)[keyof typeof commandMemberKinds];

export type CommandMember = CommandArgument | CommandReturnValue;

export type LocalizedCommandMember = Localized<CommandMember>;

/** An enum choice a class or class member defines, resolved for display. */
export type LocalizedOwnEnumChoice = Localized<Omit<EnumChoice, "parent">>;

/** What can own the choices the class editors edit. */
export type OwnEnumChoiceParentType =
  | "paramClass"
  | "cmdClassArg"
  | "cmdClassRet";

/** What one kind of class is called in labels and headings. */
export const CLASS_KIND_NAMES: Record<ClassKind, string> = {
  parameterClasses: "Parameter Class",
  structureClasses: "Structure Class",
  serializerClasses: "Serializer Class",
  resourceClasses: "Resource Class",
  commandClasses: "Command Class",
};

// The enum choice parent type each command member table uses.
const MEMBER_CHOICE_PARENT = {
  commandClassArguments: "cmdClassArg",
  commandClassReturnValues: "cmdClassRet",
} as const;

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

const NO_EDITORS: ItemEditor[] = [];

/** The classes of one kind, sorted by ID. */
export function useClassEditors(kind: ClassKind): ItemEditor[] {
  const library = useClassEditing().useLibrary();

  return useMemo(() => {
    if (!library) return NO_EDITORS;

    return Object.entries(library[kind])
      .map(([id, cls]) => ({ id: EntityId(id), codexId: cls.codexId }))
      .sort((a, b) => a.codexId.localeCompare(b.codexId));
  }, [library, kind]);
}

/** The IDs already taken in one kind, for uniqueness validation. */
export function useClassCodexIds(kind: ClassKind): CodexId[] {
  const editors = useClassEditors(kind);
  return useMemo(() => editors.map((editor) => editor.codexId), [editors]);
}

// The document being edited and the locales to read it in.
// Helper for more specific hooks below
function useLocalizing() {
  const api = useClassEditing();
  return {
    library: api.useLibrary(),
    sourceLocale: api.useSourceLocale(),
    locale: useCurrentLocale(),
  };
}

export function useParameterClassInfo(
  id: EntityId,
): LocalizedParameterClass | undefined {
  const { library, sourceLocale, locale } = useLocalizing();
  return useMemo(
    () =>
      localizeEntity(
        library,
        id,
        library?.parameterClasses[id],
        locale,
        sourceLocale,
      ),
    [library, id, locale, sourceLocale],
  );
}

export function useStructureClassInfo(
  id: EntityId,
): LocalizedStructureClass | undefined {
  const { library, sourceLocale, locale } = useLocalizing();
  return useMemo(
    () =>
      localizeEntity(
        library,
        id,
        library?.structureClasses[id],
        locale,
        sourceLocale,
      ),
    [library, id, locale, sourceLocale],
  );
}

export function useSerializerClassInfo(
  id: EntityId,
): LocalizedSerializerClass | undefined {
  const { library, sourceLocale, locale } = useLocalizing();
  return useMemo(
    () =>
      localizeEntity(
        library,
        id,
        library?.serializerClasses[id],
        locale,
        sourceLocale,
      ),
    [library, id, locale, sourceLocale],
  );
}

export function useResourceClassInfo(
  id: EntityId,
): LocalizedResourceClass | undefined {
  const { library, sourceLocale, locale } = useLocalizing();
  return useMemo(
    () =>
      localizeEntity(
        library,
        id,
        library?.resourceClasses[id],
        locale,
        sourceLocale,
      ),
    [library, id, locale, sourceLocale],
  );
}

export function useCommandClassInfo(
  id: EntityId,
): LocalizedCommandClass | undefined {
  const { library, sourceLocale, locale } = useLocalizing();
  return useMemo(
    () =>
      localizeEntity(
        library,
        id,
        library?.commandClasses[id],
        locale,
        sourceLocale,
      ),
    [library, id, locale, sourceLocale],
  );
}

const NO_MEMBERS: LocalizedCommandMember[] = [];

/** The arguments or return values of one command class, in ID order. */
export function useCommandClassMembers(
  memberKind: CommandMemberKind,
  classId: EntityId,
): LocalizedCommandMember[] {
  const { library, sourceLocale, locale } = useLocalizing();

  return useMemo(() => {
    if (!library) return NO_MEMBERS;

    const members = Object.entries(library[memberKind])
      .filter(([, member]) => member.parentId === classId)
      .map(([id, member]) =>
        localizeEntity(library, EntityId(id), member, locale, sourceLocale),
      );
    members.sort((a, b) => a.codexId.localeCompare(b.codexId));

    return members;
  }, [library, memberKind, classId, locale, sourceLocale]);
}

const NO_CHOICES: LocalizedOwnEnumChoice[] = [];

/** The enum choices one class or class member defines. */
export function useOwnEnumChoices(
  parentType: OwnEnumChoiceParentType,
  parentId: EntityId,
): LocalizedOwnEnumChoice[] {
  const { library, sourceLocale, locale } = useLocalizing();

  return useMemo(() => {
    if (!library) return NO_CHOICES;

    return enumChoicesOf(library, { type: parentType, id: parentId }).map(
      ({ parent: _parent, ...choice }) =>
        localizeEntity(library, choice.id, choice, locale, sourceLocale),
    );
  }, [library, parentType, parentId, locale, sourceLocale]);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * The edits the class editors can make, bound to the document in context.
 *
 * The API is a stable object, so these are stable too and can be handed to
 * memoized children without re-rendering them.
 */
export function useClassOperations(): ClassOperations {
  const api = useClassEditing();
  return useMemo(() => classOperations(api), [api]);
}

function classOperations(api: ClassEditingApi) {
  return {
    /** Adds an empty class of the given kind, unless the ID is taken. */
    createClass(
      kind: ClassKind,
      codexId: CodexId,
      name: string,
      locale: string,
    ) {
      api.update(`Add ${CLASS_KIND_NAMES[kind]}`, (draft, localizer) => {
        if (Object.values(draft[kind]).some((cls) => cls.codexId === codexId)) {
          return;
        }

        const id = newEntityId();
        const localized = localizer.create(kind, { name }, locale);

        switch (kind) {
          case classKinds.PARAMETER:
            draft.parameterClasses[id] = {
              codexId,
              dataType: "number",
              localized,
            };
            break;
          case classKinds.STRUCTURE:
            draft.structureClasses[id] = { codexId, localized };
            break;
          case classKinds.SERIALIZER:
            draft.serializerClasses[id] = { codexId, localized };
            break;
          case classKinds.RESOURCE:
            draft.resourceClasses[id] = { codexId, mediaType: [], localized };
            break;
          case classKinds.COMMAND:
            draft.commandClasses[id] = { codexId, localized };
            break;
        }
      });
    },

    /** Every kind of class has an ID, and only an ID, in common. */
    setClassCodexId(kind: ClassKind, id: EntityId, codexId: CodexId) {
      api.update(`Edit ${CLASS_KIND_NAMES[kind]}`, (draft) => {
        const cls = draft[kind][id];
        if (!cls) return;

        cls.codexId = codexId;
      });
    },

    modifyParameterClass(
      id: EntityId,
      recipe: (draft: Draft<Unlocalized<ParameterClass>>) => void,
    ) {
      api.update(`Edit ${CLASS_KIND_NAMES.parameterClasses}`, (draft) => {
        const cls = draft.parameterClasses[id];
        if (!cls) return;

        recipe(cls);
      });
    },

    modifyStructureClass(
      id: EntityId,
      recipe: (draft: Draft<Unlocalized<StructureClass>>) => void,
    ) {
      api.update(`Edit ${CLASS_KIND_NAMES.structureClasses}`, (draft) => {
        const cls = draft.structureClasses[id];
        if (!cls) return;

        recipe(cls);
      });
    },

    modifyResourceClass(
      id: EntityId,
      recipe: (draft: Draft<Unlocalized<ResourceClass>>) => void,
    ) {
      api.update(`Edit ${CLASS_KIND_NAMES.resourceClasses}`, (draft) => {
        const cls = draft.resourceClasses[id];
        if (!cls) return;

        recipe(cls);
      });
    },

    setClassLocalizedValue(
      kind: ClassKind,
      id: EntityId,
      field: ClassLocalizedField,
      value: string,
      locale: string,
    ) {
      api.update(`Edit ${CLASS_KIND_NAMES[kind]}`, (_draft, localizer) => {
        localizer.set(kind, id, field, value, locale);
      });
    },

    /** Removes a class along with everything that hangs off it. */
    deleteClass(kind: ClassKind, id: EntityId) {
      api.update(`Delete ${CLASS_KIND_NAMES[kind]}`, (draft, localizer) => {
        if (!draft[kind][id]) return;

        if (kind === classKinds.PARAMETER) {
          deleteEnumChoicesOf(draft, localizer, [{ type: "paramClass", id }]);
        }

        if (kind === classKinds.COMMAND) {
          deleteCommandMembers(draft, localizer, id);
        }

        localizer.remove([{ table: kind, entityId: id }]);
        delete draft[kind][id];
      });
    },

    addCommandClassMember(
      memberKind: CommandMemberKind,
      classId: EntityId,
      codexId: CodexId,
      name: string,
      locale: string,
    ) {
      api.update(
        `Add Command Class ${memberLabel(memberKind)}`,
        (draft, localizer) => {
          const siblings = select(
            draft[memberKind],
            (member) => member.parentId === classId,
          );
          if (siblings.some((member) => member.codexId === codexId)) {
            return;
          }

          draft[memberKind][newEntityId()] = {
            parentId: classId,
            codexId,
            dataType: "number",
            required: false,
            localized: localizer.create(memberKind, { name }, locale),
          };
        },
      );
    },

    modifyCommandClassMember(
      memberKind: CommandMemberKind,
      id: EntityId,
      recipe: (draft: Draft<Unlocalized<CommandMember>>) => void,
    ) {
      api.update(`Edit Command Class ${memberLabel(memberKind)}`, (draft) => {
        const member = draft[memberKind][id];
        if (!member) return;

        recipe(member);
      });
    },

    setCommandClassMemberLocalizedValue(
      memberKind: CommandMemberKind,
      id: EntityId,
      field: ClassLocalizedField,
      value: string,
      locale: string,
    ) {
      api.update(
        `Edit Command Class ${memberLabel(memberKind)}`,
        (_draft, localizer) => {
          localizer.set(memberKind, id, field, value, locale);
        },
      );
    },

    deleteCommandClassMember(memberKind: CommandMemberKind, id: EntityId) {
      api.update(
        `Delete Command Class ${memberLabel(memberKind)}`,
        (draft, localizer) => {
          if (!draft[memberKind][id]) return;

          deleteEnumChoicesOf(draft, localizer, [
            { type: MEMBER_CHOICE_PARENT[memberKind], id },
          ]);
          localizer.remove([{ table: memberKind, entityId: id }]);
          delete draft[memberKind][id];
        },
      );
    },

    addEnumChoice(
      parent: EnumChoiceParent,
      codexId: CodexId,
      name: string,
      locale: string,
    ) {
      api.update("Add Enum Choice", (draft, localizer) => {
        addEnumChoiceTo(
          draft,
          localizer,
          parent,
          codexId,
          name,
          undefined,
          locale,
        );
      });
    },

    setEnumChoiceCodexId(id: EntityId, codexId: CodexId) {
      api.update("Edit Enum Choice", (draft) => {
        modifyEnumChoiceIn(draft, id, (choice) => {
          choice.codexId = codexId;
        });
      });
    },

    setEnumChoiceLocalizedValue(
      id: EntityId,
      field: ClassLocalizedField,
      value: string,
      locale: string,
    ) {
      api.update("Edit Enum Choice", (_draft, localizer) => {
        localizer.set("enumChoices", id, field, value, locale);
      });
    },

    deleteEnumChoice(id: EntityId) {
      api.update("Delete Enum Choice", (draft, localizer) => {
        deleteEnumChoiceFrom(draft, localizer, id);
      });
    },
  };
}

export type ClassOperations = ReturnType<typeof classOperations>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolves the name and description of anything the class editors show. */
function localizeEntity<T extends ClassEntity>(
  library: Library,
  id: EntityId,
  entity: T,
  locale: string,
  sourceLocale?: string,
): Localized<T>;
function localizeEntity<T extends ClassEntity>(
  library: Library | undefined,
  id: EntityId,
  entity: T | undefined,
  locale: string,
  sourceLocale?: string,
): Localized<T> | undefined;
function localizeEntity<T extends ClassEntity>(
  library: Library | undefined,
  id: EntityId,
  entity: T | undefined,
  locale: string,
  sourceLocale?: string,
): Localized<T> | undefined {
  if (!library || !entity) {
    return undefined;
  }

  const { localized, ...rest } = entity;

  return {
    ...rest,
    id,
    name: localize(library.localizations, localized.name, locale, sourceLocale),
    description: localized.description
      ? localize(
          library.localizations,
          localized.description,
          locale,
          sourceLocale,
        )
      : undefined,
  };
}

function memberLabel(memberKind: CommandMemberKind): string {
  return memberKind === commandMemberKinds.ARGUMENT
    ? "Argument"
    : "Return Value";
}

function deleteCommandMembers(
  draft: Draft<ClassDocument>,
  localizer: ClassLocalizer,
  classId: EntityId,
): void {
  for (const memberKind of Object.values(commandMemberKinds)) {
    const members = selectWithIds(
      draft[memberKind],
      (member) => member.parentId === classId,
    );

    deleteEnumChoicesOf(
      draft,
      localizer,
      members.map((member) => ({
        type: MEMBER_CHOICE_PARENT[memberKind],
        id: member.id,
      })),
    );

    localizer.remove(
      members.map((member) => ({ table: memberKind, entityId: member.id })),
    );

    for (const member of members) {
      delete draft[memberKind][member.id];
    }
  }
}

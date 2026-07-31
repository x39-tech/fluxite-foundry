// The app's normalized form of a Fluxite Codex library.
//
// A device class carries its own inline "device library" of classes, which the
// editor stores as flat tables keyed by EntityId. Imported libraries hold the
// same kinds of classes, but nested and keyed by CodexId. Normalizing imported
// libraries into the editor's shape at load time means class resolution has a
// single implementation and a single localization function, and the only
// remaining difference between a device library and an imported one is whether
// it is editable.

import {
  DeviceLibrary as FCDeviceLibrary,
  Library as FCLibrary,
} from "@cpwg-community/delver";
import {
  CodexId,
  CommandArgument,
  CommandClass,
  CommandReturnValue,
  EntityId,
  EnumChoice,
  LocalizationDbSchema,
  LocalizationKey,
  LocalizationReferencedItem,
  ParameterClass,
  ResourceClass,
  SerializerClass,
  StructureClass,
} from "app/persistentState";
import {
  importLocalizations,
  LocalizationStrings,
} from "utils/localizationUtils";
import { newEntityId, optionalLocalizationKey } from "app/stateUtils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// A collection of item classes in the app's normalized form. The device class
// editor state satisfies this structurally, so a device library and an imported
// library are the same thing to everything downstream of resolution.
export interface Library {
  parameterClasses: Record<EntityId, ParameterClass>;
  structureClasses: Record<EntityId, StructureClass>;
  serializerClasses: Record<EntityId, SerializerClass>;
  resourceClasses: Record<EntityId, ResourceClass>;
  commandClasses: Record<EntityId, CommandClass>;
  commandClassArguments: Record<EntityId, CommandArgument>;
  commandClassReturnValues: Record<EntityId, CommandReturnValue>;
  enumChoices: Record<EntityId, EnumChoice>;
  localizations: Record<LocalizationKey, LocalizationStrings>;
}

// The kinds of class a reference can name.
export type ClassKind =
  | "parameterClasses"
  | "resourceClasses"
  | "commandClasses";

// The kinds of class member that are referenced by CodexId from outside their
// owning class. Arguments and return values are indexed separately because one
// command class can own an argument and a return value with the same CodexId.
export type MemberKind =
  | "commandArguments"
  | "commandReturnValues"
  | "enumChoices";

// CodexId to EntityId for an imported library, built once when the library is
// normalized. Member maps are keyed by the owner's EntityId first: member
// CodexIds are only unique within their owner.
export interface LibraryIndex {
  parameterClasses: Map<CodexId, EntityId>;
  structureClasses: Map<CodexId, EntityId>;
  serializerClasses: Map<CodexId, EntityId>;
  resourceClasses: Map<CodexId, EntityId>;
  commandClasses: Map<CodexId, EntityId>;
  commandArguments: Map<EntityId, Map<CodexId, EntityId>>;
  commandReturnValues: Map<EntityId, Map<CodexId, EntityId>>;
  enumChoices: Map<EntityId, Map<CodexId, EntityId>>;
}

export interface ImportedLibrary {
  id: string;
  version: string;
  descriptionKey: LocalizationKey;
  library: Library;
  index: LibraryIndex;
}

export type LibraryStore = Record<string, Record<string, ImportedLibrary>>;

// Records that a localizable string is referenced by an entity, so the edit
// path can garbage-collect unreferenced localizations. Imported libraries are
// never edited, so the normalizer has no use for it.
export type AddLocalizationReference = (
  itemId: EntityId,
  itemType: LocalizationReferencedItem["itemType"],
  locKey: string | undefined,
) => void;

// ---------------------------------------------------------------------------
// Construction
// ---------------------------------------------------------------------------

export function emptyLibrary(): Library {
  return {
    parameterClasses: {},
    structureClasses: {},
    serializerClasses: {},
    resourceClasses: {},
    commandClasses: {},
    commandClassArguments: {},
    commandClassReturnValues: {},
    enumChoices: {},
    localizations: {},
  };
}

export function emptyLibraryIndex(): LibraryIndex {
  return {
    parameterClasses: new Map(),
    structureClasses: new Map(),
    serializerClasses: new Map(),
    resourceClasses: new Map(),
    commandClasses: new Map(),
    commandArguments: new Map(),
    commandReturnValues: new Map(),
    enumChoices: new Map(),
  };
}

// Converts a parsed Fluxite Codex library into the app's normalized form.
export function normalizeLibrary(
  id: string,
  version: string,
  fcLibrary: FCLibrary,
): ImportedLibrary {
  const library = emptyLibrary();
  const index = emptyLibraryIndex();

  importLocalizations(fcLibrary.localizations, library.localizations, () => ({
    strings: LocalizationDbSchema.parse({}),
  }));
  importClasses(fcLibrary, library, index);

  return {
    id,
    version,
    descriptionKey: LocalizationKey(fcLibrary["@description"]),
    library,
    index,
  };
}

// ---------------------------------------------------------------------------
// Shared importers
//
// These run for both imported libraries and the device library inlined in a
// device class.
// ---------------------------------------------------------------------------

export function importClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  addLocalizationReference?: AddLocalizationReference,
) {
  importParameterClasses(source, target, index, addLocalizationReference);
  importStructureClasses(source, target, index, addLocalizationReference);
  importSerializerClasses(source, target, index, addLocalizationReference);
  importResourceClasses(source, target, index, addLocalizationReference);
  importCommandClasses(source, target, index, addLocalizationReference);
}

function importParameterClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  addLocRef?: AddLocalizationReference,
) {
  for (const [id, cls] of Object.entries(source.parameterClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.parameterClasses[classId] = {
      codexId,
      dataType: cls.dataType,
      unit: cls.unit,
      localized: {
        name: LocalizationKey(cls["@name"]),
        description: optionalLocalizationKey(cls["@description"]),
      },
    };
    index.parameterClasses.set(codexId, classId);

    addLocRef?.(classId, "paramClassName", cls["@name"]);
    addLocRef?.(classId, "paramClassDesc", cls["@description"]);

    importEnumChoices(
      cls.choices,
      { type: "paramClass", id: classId },
      "enumName",
      target,
      index,
      addLocRef,
    );
  }
}

function importStructureClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  addLocRef?: AddLocalizationReference,
) {
  for (const [id, cls] of Object.entries(source.structureClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.structureClasses[classId] = {
      codexId,
      multipleAllowed: cls.multipleAllowed,
      localized: {
        name: LocalizationKey(cls["@name"]),
        description: optionalLocalizationKey(cls["@description"]),
      },
    };
    index.structureClasses.set(codexId, classId);

    addLocRef?.(classId, "structClassName", cls["@name"]);
    addLocRef?.(classId, "structClassDesc", cls["@description"]);
  }
}

function importSerializerClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  addLocRef?: AddLocalizationReference,
) {
  for (const [id, cls] of Object.entries(source.serializerClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.serializerClasses[classId] = {
      codexId,
      localized: {
        name: LocalizationKey(cls["@name"]),
        description: optionalLocalizationKey(cls["@description"]),
      },
    };
    index.serializerClasses.set(codexId, classId);

    addLocRef?.(classId, "serClassName", cls["@name"]);
    addLocRef?.(classId, "serClassDesc", cls["@description"]);
  }
}

function importResourceClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  addLocRef?: AddLocalizationReference,
) {
  for (const [id, cls] of Object.entries(source.resourceClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.resourceClasses[classId] = {
      codexId,
      mediaType: cls.mediaType,
      localized: {
        name: LocalizationKey(cls["@name"]),
        description: optionalLocalizationKey(cls["@description"]),
      },
    };
    index.resourceClasses.set(codexId, classId);

    addLocRef?.(classId, "resClassName", cls["@name"]);
    addLocRef?.(classId, "resClassDesc", cls["@description"]);
  }
}

function importCommandClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  addLocRef?: AddLocalizationReference,
) {
  for (const [id, cls] of Object.entries(source.commandClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.commandClasses[classId] = {
      codexId,
      localized: {
        name: LocalizationKey(cls["@name"]),
        description: optionalLocalizationKey(cls["@description"]),
      },
    };
    index.commandClasses.set(codexId, classId);

    addLocRef?.(classId, "cmdClassName", cls["@name"]);
    addLocRef?.(classId, "cmdClassDesc", cls["@description"]);

    const argIds = new Map<CodexId, EntityId>();
    index.commandArguments.set(classId, argIds);
    for (const [argIdStr, arg] of Object.entries(cls.arguments || {})) {
      const argCodexId = CodexId(argIdStr);
      const argId = newEntityId();
      target.commandClassArguments[argId] = {
        parentId: classId,
        codexId: argCodexId,
        dataType: arg.dataType,
        unit: arg.unit,
        required: arg.required,
        localized: {
          name: LocalizationKey(arg["@name"]),
          description: optionalLocalizationKey(arg["@description"]),
        },
      };
      argIds.set(argCodexId, argId);

      addLocRef?.(argId, "cmdArgName", cls["@name"]);
      addLocRef?.(argId, "cmdArgDesc", cls["@description"]);

      importEnumChoices(
        arg.choices,
        { type: "cmdClassArg", id: argId },
        "cmdEnumName",
        target,
        index,
        addLocRef,
      );
    }

    const retIds = new Map<CodexId, EntityId>();
    index.commandReturnValues.set(classId, retIds);
    for (const [retIdStr, ret] of Object.entries(cls.returns || {})) {
      const retCodexId = CodexId(retIdStr);
      const retId = newEntityId();
      target.commandClassReturnValues[retId] = {
        parentId: classId,
        codexId: retCodexId,
        dataType: ret.dataType,
        unit: ret.unit,
        required: ret.required,
        localized: {
          name: LocalizationKey(ret["@name"]),
          description: optionalLocalizationKey(ret["@description"]),
        },
      };
      retIds.set(retCodexId, retId);

      addLocRef?.(retId, "cmdRetName", cls["@name"]);
      addLocRef?.(retId, "cmdRetDesc", cls["@description"]);

      importEnumChoices(
        ret.choices,
        { type: "cmdClassRet", id: retId },
        "cmdEnumName",
        target,
        index,
        addLocRef,
      );
    }
  }
}

function importEnumChoices(
  choices: { id: string; "@name": string }[] | undefined,
  parent: {
    type: "paramClass" | "cmdClassArg" | "cmdClassRet";
    id: EntityId;
  },
  nameItemType: LocalizationReferencedItem["itemType"],
  target: Library,
  index: LibraryIndex,
  addLocRef?: AddLocalizationReference,
) {
  const choiceIds = new Map<CodexId, EntityId>();
  index.enumChoices.set(parent.id, choiceIds);

  for (const [choiceIndex, choice] of (choices || []).entries()) {
    const choiceCodexId = CodexId(choice.id);
    const choiceId = newEntityId();
    target.enumChoices[choiceId] = {
      parent,
      codexId: choiceCodexId,
      index: choiceIndex,
      localized: {
        name: LocalizationKey(choice["@name"]),
        // TODO: description
      },
    };
    choiceIds.set(choiceCodexId, choiceId);

    addLocRef?.(choiceId, nameItemType, choice["@name"]);
    // TODO: description
  }
}

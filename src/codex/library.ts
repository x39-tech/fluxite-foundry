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
  LocalizationKey,
  ParameterClass,
  ResourceClass,
  SerializerClass,
  StructureClass,
} from "app/persistentState";
import {
  importCategoryLocalizations,
  importLocalizations,
} from "features/localizations/localize";
import { LocalizationStrings } from "features/localizations/types";
import { newEntityId } from "app/stateUtils";
import { CategoryLocalizations } from "./categories";

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
  // Currently this is only contained by an imported library, not a device class
  // document.
  categoryLocalizations?: CategoryLocalizations;
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

  importLocalizations(fcLibrary.localizations, library.localizations);
  library.categoryLocalizations = importCategoryLocalizations(
    fcLibrary.localizations,
  );
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

/**
 * Translates a key the file used into the key the target holds it under.
 *
 * An imported library keeps the file's keys, because its strings are only ever
 * read. Editable document types need a translation because their localizations
 * are editable, so they make them entities with opaque entity IDs.
 */
export type MapLocalizationKey = (fileKey: string) => LocalizationKey;

const keepFileKey: MapLocalizationKey = (fileKey) => LocalizationKey(fileKey);

export function importClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  mapKey: MapLocalizationKey = keepFileKey,
) {
  importParameterClasses(source, target, index, mapKey);
  importStructureClasses(source, target, index, mapKey);
  importSerializerClasses(source, target, index, mapKey);
  importResourceClasses(source, target, index, mapKey);
  importCommandClasses(source, target, index, mapKey);
}

function importParameterClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  mapKey: MapLocalizationKey,
) {
  for (const [id, cls] of Object.entries(source.parameterClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.parameterClasses[classId] = {
      codexId,
      dataType: cls.dataType,
      unit: cls.unit,
      localized: {
        name: mapKey(cls["@name"]),
        description: optionalMappedKey(cls["@description"], mapKey),
      },
    };
    index.parameterClasses.set(codexId, classId);

    importEnumChoices(
      cls.choices,
      { type: "paramClass", id: classId },
      target,
      index,
      mapKey,
    );
  }
}

function importStructureClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  mapKey: MapLocalizationKey,
) {
  for (const [id, cls] of Object.entries(source.structureClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.structureClasses[classId] = {
      codexId,
      multipleAllowed: cls.multipleAllowed,
      localized: {
        name: mapKey(cls["@name"]),
        description: optionalMappedKey(cls["@description"], mapKey),
      },
    };
    index.structureClasses.set(codexId, classId);
  }
}

function importSerializerClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  mapKey: MapLocalizationKey,
) {
  for (const [id, cls] of Object.entries(source.serializerClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.serializerClasses[classId] = {
      codexId,
      localized: {
        name: mapKey(cls["@name"]),
        description: optionalMappedKey(cls["@description"], mapKey),
      },
    };
    index.serializerClasses.set(codexId, classId);
  }
}

function importResourceClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  mapKey: MapLocalizationKey,
) {
  for (const [id, cls] of Object.entries(source.resourceClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.resourceClasses[classId] = {
      codexId,
      mediaType: cls.mediaType,
      localized: {
        name: mapKey(cls["@name"]),
        description: optionalMappedKey(cls["@description"], mapKey),
      },
    };
    index.resourceClasses.set(codexId, classId);
  }
}

function importCommandClasses(
  source: FCDeviceLibrary,
  target: Library,
  index: LibraryIndex,
  mapKey: MapLocalizationKey,
) {
  for (const [id, cls] of Object.entries(source.commandClasses || {})) {
    const codexId = CodexId(id);
    const classId = newEntityId();
    target.commandClasses[classId] = {
      codexId,
      localized: {
        name: mapKey(cls["@name"]),
        description: optionalMappedKey(cls["@description"], mapKey),
      },
    };
    index.commandClasses.set(codexId, classId);

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
          name: mapKey(arg["@name"]),
          description: optionalMappedKey(arg["@description"], mapKey),
        },
      };
      argIds.set(argCodexId, argId);

      importEnumChoices(
        arg.choices,
        { type: "cmdClassArg", id: argId },
        target,
        index,
        mapKey,
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
          name: mapKey(ret["@name"]),
          description: optionalMappedKey(ret["@description"], mapKey),
        },
      };
      retIds.set(retCodexId, retId);

      importEnumChoices(
        ret.choices,
        { type: "cmdClassRet", id: retId },
        target,
        index,
        mapKey,
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
  target: Library,
  index: LibraryIndex,
  mapKey: MapLocalizationKey,
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
        name: mapKey(choice["@name"]),
        // TODO: description
      },
    };
    choiceIds.set(choiceCodexId, choiceId);
    // TODO: description
  }
}

function optionalMappedKey(
  fileKey: string | undefined,
  mapKey: MapLocalizationKey,
): LocalizationKey | undefined {
  return fileKey === undefined ? undefined : mapKey(fileKey);
}

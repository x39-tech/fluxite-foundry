import {
  E173UDRDocuments,
  Library,
  ParameterClass,
  StructureClass,
} from "generated/draft-2023-1/udr-document";
import udrDocumentSchema from "e173/schemas/draft-2023-1/full/udr-document.json";
import core from "e173/libraries/core/draft-2023-1/library.json";
import intensityColor from "e173/libraries/intensity-color/draft-2023-1/library.json";
import motion from "e173/libraries/motion/draft-2023-1/library.json";
import { validateWithSchema } from "../utils/schemaValidation";

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Types
///////////////////////////////////////////////////////////////////////////////////////////////////

export interface ItemClass {
  "@name": string;
  "@description"?: string;
}

export interface ItemClassWithId extends ItemClass {
  libraryId: string;
  id: string;
}

export type ParameterClassWithId = ParameterClass & ItemClassWithId;

export type StructureClassWithId = StructureClass & ItemClassWithId;

interface ItemClassDatabase {
  parameters: ParameterClassWithId[];
  structures: StructureClassWithId[];
}

interface LibraryDatabase {
  [key: string]: Library;
}

export interface UdrDatabase {
  libraries: LibraryDatabase;
  itemClasses: ItemClassDatabase;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

export function getEmptyUdrDatabase(): UdrDatabase {
  return {
    libraries: {},
    itemClasses: {
      parameters: [],
      structures: [],
    },
  };
}

export function udrDatabaseIsEmpty(database: Readonly<UdrDatabase>): boolean {
  return (
    !database.libraries &&
    !database.itemClasses.parameters &&
    !database.itemClasses.structures
  );
}

export function getAllParametersWithIds(
  database: Readonly<UdrDatabase>,
): ParameterClassWithId[] {
  return database.itemClasses.parameters;
}

export function getAllStructuresWithIds(
  database: Readonly<UdrDatabase>,
): StructureClassWithId[] {
  return database.itemClasses.structures;
}

export function getItemClassName(
  database: Readonly<UdrDatabase>,
  itemClass: ItemClassWithId,
): string | undefined {
  if (!(itemClass.libraryId in database.libraries)) {
    return undefined;
  }

  const library = database.libraries[itemClass.libraryId];

  // TODO: use current localization
  return library.localizations?.en?.strings?.[itemClass["@name"]];
}

export function getItemClassDescription(
  database: Readonly<UdrDatabase>,
  itemClass: ItemClassWithId,
): string | undefined {
  if (
    !itemClass["@description"] ||
    !(itemClass.libraryId in database.libraries)
  ) {
    return undefined;
  }

  const library = database.libraries[itemClass.libraryId];

  // TODO: use current localization
  return library.localizations?.en?.strings?.[itemClass["@description"]];
}

export function lookupParameterClass(
  database: Readonly<UdrDatabase>,
  className: string,
): ParameterClassWithId | undefined {
  const classInfo = getClassInfo(className, database.libraries);
  if (!classInfo) {
    return undefined;
  }

  const cls = classInfo.library.parameterClasses?.[classInfo.classId];
  return cls
    ? {
        ...cls,
        id: classInfo.classId,
        libraryId: classInfo.libraryId,
      }
    : undefined;
}

export function lookupStructureClass(
  database: Readonly<UdrDatabase>,
  className: string,
): StructureClassWithId | undefined {
  const classInfo = getClassInfo(className, database.libraries);
  if (!classInfo) {
    return undefined;
  }

  const cls = classInfo.library.structureClasses?.[classInfo.classId];
  return cls
    ? {
        ...cls,
        id: classInfo.classId,
        libraryId: classInfo.libraryId,
      }
    : undefined;
}

export function getLibraryFriendlyName(
  database: Readonly<UdrDatabase>,
  libraryId: string,
): string | undefined {
  if (!(libraryId in database.libraries)) {
    return undefined;
  }

  const library = database.libraries[libraryId];

  // TODO: use current localization
  return library.localizations?.en?.strings?.[library["@description"]];
}

export type LoadLibrariesResult = true | string;

export function loadLibrariesFromDocument(
  document: object,
  database: UdrDatabase,
): LoadLibrariesResult {
  const validateResult = validateWithSchema(udrDocumentSchema, document);
  if (validateResult !== true) {
    return validateResult;
  }

  const libraries = (document as E173UDRDocuments).e173.libraries;
  if (!libraries) {
    // Nothing to load
    return true;
  }

  if (Object.keys(libraries).some((id) => id in database.libraries)) {
    // Library already exists
    return "A library with the same identifier is already loaded";
  }

  // TODO: Verify localizations

  const itemDb = Object.entries(libraries).reduce(
    (itemDb, [libraryId, library]) => {
      return concatItemClasses(itemDb, {
        parameters: transformItemClasses(libraryId, library.parameterClasses),
        structures: transformItemClasses(libraryId, library.structureClasses),
      });
    },
    {
      parameters: [],
      structures: [],
    } as ItemClassDatabase,
  );

  database.libraries = {
    ...libraries,
    ...database.libraries,
  };
  database.itemClasses = concatItemClasses(database.itemClasses, itemDb);

  return true;
}

const DEFAULT_LIBRARY_DOCUMENTS = [core, intensityColor, motion];

export function loadDefaultLibraries(): UdrDatabase {
  const database = getEmptyUdrDatabase();

  for (const document of DEFAULT_LIBRARY_DOCUMENTS) {
    loadLibrariesFromDocument(document, database);
  }

  return database;
}

export function getFullyQualifiedId(itemClass: ItemClassWithId): string {
  return `${itemClass.libraryId}/${itemClass.id}`;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

interface ClassInfo {
  library: Library;
  libraryId: string;
  classId: string;
}

function getClassInfo(
  className: string,
  libraryDatabase: LibraryDatabase,
): ClassInfo | undefined {
  // Class string must have at least one slash: <qualified identifier>/<identifier>
  const parts = className.split("/");
  if (parts.length < 2) {
    return undefined;
  }

  const libraryId = parts[0];
  const classId = parts.slice(1).join("/");

  if (!(libraryId in libraryDatabase)) {
    return undefined;
  }

  return {
    library: libraryDatabase[libraryId],
    libraryId,
    classId,
  };
}

function transformItemClasses<ClassType extends ItemClass>(
  libraryId: string,
  libraryClasses?: { [key: string]: ClassType },
): (ClassType & ItemClassWithId)[] {
  return libraryClasses
    ? Object.entries(libraryClasses).map(([id, itemClass]) => {
        return {
          libraryId,
          id,
          ...itemClass,
        };
      })
    : [];
}

function concatItemClasses(
  existingDb: ItemClassDatabase,
  newDb: ItemClassDatabase,
): ItemClassDatabase {
  return {
    parameters: existingDb.parameters.concat(newDb.parameters),
    structures: existingDb.structures.concat(newDb.structures),
  };
}

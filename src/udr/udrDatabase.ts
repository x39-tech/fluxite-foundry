import {
  Library,
  ParameterClass,
  StructureClass,
  importUdr,
  Error as E173Error,
} from "e173";
import core from "e173/libraries/core/draft-2024-1/library.json";
import intensityColor from "e173/libraries/intensity-color/draft-2024-1/library.json";
import motion from "e173/libraries/motion/draft-2024-1/library.json";

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Types
///////////////////////////////////////////////////////////////////////////////////////////////////

export interface ItemClass {
  "@name": string;
  "@description"?: string;
}

export interface ItemClassWithId extends ItemClass {
  libraryId: string;
  libraryVersion: string;
  id: string;
}

export type ParameterClassWithId = ParameterClass & ItemClassWithId;

export type StructureClassWithId = StructureClass & ItemClassWithId;

interface ItemClassDatabase {
  parameters: ParameterClassWithId[];
  structures: StructureClassWithId[];
}

interface LibraryDatabase {
  [key: string]: {
    [key: string]: Library;
  };
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

  // TODO: use current localization
  const library =
    database.libraries[itemClass.libraryId]?.[itemClass.libraryVersion];

  if (!library) {
    return undefined;
  }

  // TODO: use current localization
  return library.localizations?.["en-US"]?.strings?.[itemClass["@name"]];
}

export function getItemClassDescription(
  database: Readonly<UdrDatabase>,
  itemClass: ItemClassWithId,
): string | undefined {
  if (!itemClass["@description"]) {
    return undefined;
  }

  const library =
    database.libraries[itemClass.libraryId]?.[itemClass.libraryVersion];

  if (!library) {
    return undefined;
  }

  // TODO: use current localization
  return library.localizations?.["en-US"]?.strings?.[itemClass["@description"]];
}

export function lookupParameterClass(
  database: Readonly<UdrDatabase>,
  libraryId: string,
  libraryVersion: string,
  classId: string,
): ParameterClassWithId | undefined {
  const cls =
    database.libraries[libraryId]?.[libraryVersion]?.parameterClasses?.[
      classId
    ];

  return cls
    ? {
        ...cls,
        id: classId,
        libraryId,
        libraryVersion,
      }
    : undefined;
}

export function lookupStructureClass(
  database: Readonly<UdrDatabase>,
  libraryId: string,
  libraryVersion: string,
  classId: string,
): StructureClassWithId | undefined {
  const cls =
    database.libraries[libraryId]?.[libraryVersion]?.structureClasses?.[
      classId
    ];

  return cls
    ? {
        ...cls,
        id: classId,
        libraryId,
        libraryVersion,
      }
    : undefined;
}

export function getLibraryFriendlyName(
  database: Readonly<UdrDatabase>,
  libraryId: string,
  libraryVersion: string,
): string | undefined {
  const library = database.libraries[libraryId]?.[libraryVersion];

  if (!library) {
    return undefined;
  }

  // TODO: use current localization
  return library.localizations?.["en-US"]?.strings?.[library["@description"]];
}

export type LoadLibrariesResult = true | string;

export function loadLibrariesFromDocument(
  doc_obj: object,
  database: UdrDatabase,
): LoadLibrariesResult {
  let document;
  try {
    document = importUdr(doc_obj);
  } catch (err) {
    const e173err = err as E173Error;
    let errMsg = `Error loading UDR library document: ${e173err.type}: ${e173err.description}`;
    if (e173err.path) {
      errMsg += `at ${e173err.path}`;
    } else if (e173err.line && e173err.column) {
      errMsg += `at line ${e173err.line}, column ${e173err.column}`;
    }
    return errMsg;
  }

  const libraries = document.e173doc.libraries;
  if (!libraries) {
    // Nothing to load
    return true;
  }

  for (const [key, versionCollection] of Object.entries(libraries)) {
    if (key in database.libraries) {
      for (const version in versionCollection) {
        if (version in database.libraries[key]) {
          // Library already exists
          return "A library with the same identifier is already loaded";
        }
      }
    }
  }

  // TODO: Verify localizations

  let itemDb: ItemClassDatabase = { parameters: [], structures: [] };
  for (const [libraryId, libraryVersionCollection] of Object.entries(
    libraries,
  )) {
    for (const [version, library] of Object.entries(libraryVersionCollection)) {
      itemDb = concatItemClasses(itemDb, {
        parameters: transformItemClasses(
          libraryId,
          version,
          library.parameterClasses,
        ),
        structures: transformItemClasses(
          libraryId,
          version,
          library.structureClasses,
        ),
      });
    }
  }

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
    const loadLibrariesResult = loadLibrariesFromDocument(document, database);
    if (loadLibrariesResult !== true) {
      console.log(`Error loading default library: ${loadLibrariesResult}`);
    }
  }

  return database;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Private Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

function transformItemClasses<ClassType extends ItemClass>(
  libraryId: string,
  libraryVersion: string,
  libraryClasses: Record<string, ClassType>,
): (ClassType & ItemClassWithId)[] {
  return libraryClasses
    ? Object.entries(libraryClasses).map(([id, itemClass]) => {
        return {
          libraryId,
          libraryVersion,
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

import {
  Library,
  ParameterClass,
  StructureClass,
  importUdr,
  Error as E173Error,
  ResourceClass,
  CommandClass,
} from "e173";
import core from "e173/libraries/core/draft-2024-1/library.json";
import intensityColor from "e173/libraries/intensity-color/draft-2024-1/library.json";
import motion from "e173/libraries/motion/draft-2024-1/library.json";
import {
  CodexId,
  EntityId,
  Localization,
  LocalizationKey,
} from "app/persistentState";
import { fcLocalize, localize, LocalizedString } from "utils/localizationUtils";

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Types
///////////////////////////////////////////////////////////////////////////////////////////////////

export interface LocalItemClassWithId {
  type: "local";
  id: EntityId;
  codexId: CodexId;
  localized: {
    name: LocalizationKey;
    description?: LocalizationKey;
  };
}

export interface ImportedItemClass {
  "@name": string;
  "@description"?: string;
}

export interface ImportedItemClassWithId extends ImportedItemClass {
  type: "imported";
  codexId: CodexId;
  libraryId: string;
  libraryVersion: string;
}

export type ItemClassWithId = LocalItemClassWithId | ImportedItemClassWithId;

export interface LibraryWithId extends Library {
  id: string;
  version: string;
}

export type ParameterClassWithId = ParameterClass & ImportedItemClassWithId;

export type StructureClassWithId = StructureClass & ImportedItemClassWithId;

export type ResourceClassWithId = ResourceClass & ImportedItemClassWithId;

export type CommandClassWithId = CommandClass & ImportedItemClassWithId;

interface LibraryDatabase {
  [key: string]: {
    [key: string]: Library;
  };
}

export interface CodexDatabase {
  libraries: LibraryDatabase;
}

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

export function getEmptyCodexDatabase(): CodexDatabase {
  return {
    libraries: {},
  };
}

export function codexDatabaseIsEmpty(
  database: Readonly<CodexDatabase>,
): boolean {
  return !database.libraries;
}

export function getNewestVersionOfEachLibrary(
  database: Readonly<CodexDatabase>,
): LibraryWithId[] {
  const libraries: LibraryWithId[] = [];
  for (const [libraryId, versions] of Object.entries(database.libraries)) {
    const versionKeys = Object.keys(versions);
    if (versionKeys.length > 0) {
      // TODO: proper version sort
      const newestVersion = versionKeys.sort().reverse()[0];
      libraries.push({
        ...versions[newestVersion],
        id: libraryId,
        version: newestVersion,
      });
    }
  }
  return libraries;
}

export function getItemClassName(
  itemClass: ItemClassWithId,
  database: Readonly<CodexDatabase>,
  localizations: Record<LocalizationKey, Localization>,
  locale: string,
): LocalizedString | undefined {
  if (itemClass.type === "local") {
    return localize(localizations, itemClass.localized.name, locale);
  } else {
    if (!(itemClass.libraryId in database.libraries)) {
      return undefined;
    }

    return fcLocalize(
      database.libraries[itemClass.libraryId]?.[itemClass.libraryVersion]
        ?.localizations,
      itemClass["@name"],
      locale,
    );
  }
}

export function getItemClassNameOrId(
  itemClass: ItemClassWithId,
  database: Readonly<CodexDatabase>,
  localizations: Record<LocalizationKey, Localization>,
  locale: string,
): LocalizedString {
  const name = getItemClassName(itemClass, database, localizations, locale);
  return name || { desiredLocale: locale, value: itemClass.codexId };
}

export function getItemClassDescription(
  itemClass: ItemClassWithId,
  database: Readonly<CodexDatabase>,
  localizations: Record<LocalizationKey, Localization>,
  locale: string,
): LocalizedString | undefined {
  if (itemClass.type === "local") {
    if (!itemClass.localized.description) {
      return undefined;
    }

    return localize(localizations, itemClass.localized.description, locale);
  } else {
    if (
      !itemClass["@description"] ||
      !(itemClass.libraryId in database.libraries)
    ) {
      return undefined;
    }

    return fcLocalize(
      database.libraries[itemClass.libraryId]?.[itemClass.libraryVersion]
        .localizations,
      itemClass["@description"],
      locale,
    );
  }
}

export function getLibraryFriendlyName(
  library: LibraryWithId,
  locale: string,
): LocalizedString {
  return fcLocalize(library.localizations, library["@description"], locale);
}

export type LoadLibrariesResult = true | string;

export function loadLibrariesFromDocument(
  doc_obj: object,
  database: CodexDatabase,
): LoadLibrariesResult {
  let document;
  try {
    document = importUdr(doc_obj);
  } catch (err) {
    const e173err = err as E173Error;
    let errMsg = `Error loading Fluxite Codex library document: ${e173err.type}: ${e173err.description}`;
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

  database.libraries = {
    ...libraries,
    ...database.libraries,
  };

  return true;
}

const DEFAULT_LIBRARY_DOCUMENTS = [core, intensityColor, motion];

export function loadDefaultLibraries(): CodexDatabase {
  const database = getEmptyCodexDatabase();

  for (const document of DEFAULT_LIBRARY_DOCUMENTS) {
    const loadLibrariesResult = loadLibrariesFromDocument(document, database);
    if (loadLibrariesResult !== true) {
      console.log(`Error loading default library: ${loadLibrariesResult}`);
    }
  }

  return database;
}

import { parseFluxiteCodexDocument } from "@cpwg-community/delver";
import semver from "semver";
import { localize, LocalizedString } from "utils/localizationUtils";
import { errorMessage } from "utils/utils";
import { ImportedLibrary, LibraryStore, normalizeLibrary } from "./library";

import core from "e173/libraries/core/draft-2026-1/library.fcd";
import intensityColor from "e173/libraries/intensity-color/draft-2026-1/library.fcd";
import motion from "e173/libraries/motion/draft-2026-1/library.fcd";
import effect from "e173/libraries/effect/draft-2026-1/library.fcd";
import shape from "e173/libraries/shape/draft-2026-1/library.fcd";
import gobo from "e173/libraries/gobo/draft-2026-1/library.fcd";

///////////////////////////////////////////////////////////////////////////////////////////////////
// Public Functions
///////////////////////////////////////////////////////////////////////////////////////////////////

export function getEmptyLibraryStore(): LibraryStore {
  return {};
}

export function libraryStoreIsEmpty(store: Readonly<LibraryStore>): boolean {
  return Object.keys(store).length === 0;
}

export function getNewestVersionOfEachLibrary(
  store: Readonly<LibraryStore>,
): ImportedLibrary[] {
  const libraries: ImportedLibrary[] = [];
  for (const versions of Object.values(store)) {
    const versionKeys = Object.keys(versions);
    if (versionKeys.length > 0) {
      const newestVersion = versionKeys.sort(semver.compare).reverse()[0];
      libraries.push(versions[newestVersion]);
    }
  }
  return libraries;
}

export function getLibraryFriendlyName(
  library: ImportedLibrary,
  locale: string,
): LocalizedString {
  return localize(
    library.library.localizations,
    library.descriptionKey,
    locale,
  );
}

export type LoadLibrariesResult = true | string;

export function loadLibrariesFromDocument(
  doc_obj: object,
  store: LibraryStore,
): LoadLibrariesResult {
  let document;
  try {
    document = parseFluxiteCodexDocument(doc_obj);
  } catch (err) {
    return `Error loading Fluxite Codex library document: ${errorMessage(err)}`;
  }

  const libraries = document.document.e173doc.libraries;
  if (!libraries) {
    // Nothing to load
    return true;
  }

  for (const [id, versionCollection] of Object.entries(libraries)) {
    for (const version in versionCollection) {
      if (store[id]?.[version]) {
        return "A library with the same identifier is already loaded";
      }
    }
  }

  // TODO: Verify localizations

  for (const [id, versionCollection] of Object.entries(libraries)) {
    for (const [version, fcLibrary] of Object.entries(versionCollection)) {
      store[id] ||= {};
      store[id][version] = normalizeLibrary(id, version, fcLibrary);
    }
  }

  return true;
}

const DEFAULT_LIBRARY_DOCUMENTS = [
  core,
  intensityColor,
  motion,
  effect,
  shape,
  gobo,
];

let defaultLibraries: LibraryStore | undefined = undefined;

export function loadDefaultLibraries(): LibraryStore {
  if (defaultLibraries) {
    return defaultLibraries;
  }

  const store = getEmptyLibraryStore();

  for (const document of DEFAULT_LIBRARY_DOCUMENTS) {
    const loadLibrariesResult = loadLibrariesFromDocument(document, store);
    if (loadLibrariesResult !== true) {
      console.log(`Error loading default library: ${loadLibrariesResult}`);
    }
  }

  defaultLibraries = store;
  return store;
}

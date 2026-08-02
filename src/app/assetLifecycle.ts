// Manage the lifecycle of the binary assets that documents refer to.
//
// An asset belongs to the documents that refer to it. To better support undo
// and redo functionality, an asset is not deleted when its last referrer is
// removed. Instead, assets are cleaned up at two different times:
//
// 1. When a document is closed, all assets that document referred to which no
//    other document currently refers to are deleted.
// 2. On app startup, all assets that are not referenced by any document in the
//    rehydrated app persistent state are deleted.
//
// This currently doesn't guard against assets being created while a cleanup is
// running. The places where cleanup now runs do not run into this issue, but a
// full-asset cleanup that runs at a time other than startup would need to guard
// against assets being created during that time (race condition between the
// asset going in the database and the state slice that refers to it being
// added).

import { assetStorage } from "./assetStorage";
import {
  AppPersistentState,
  Document,
  DocumentType,
  EntityId,
} from "./persistentState";
import { useAppPersistentStore } from "./store";
import { assetIdsHeldByHistory } from "./undo";

/**
 * How documents of one type refer to assets.
 *
 * `assetIds` is only ever asked about a document that `documentIds` returned
 * for the same state.
 */
export interface DocumentAssets {
  /** The kind of document this describes. */
  type: DocumentType;
  /** The ids of the documents of this type the state holds. */
  documentIds: (state: AppPersistentState) => EntityId[];
  /** The ids of the assets one of those documents refers to. */
  assetIds: (state: AppPersistentState, documentId: EntityId) => string[];
  /**
   * Points a document at assets that are stored under different ids than the
   * ones it names.
   *
   * Give a function that remaps old asset IDs to new ones, and any of the old
   * set found within the document will be replaced with the corresponding new ID.
   */
  remapAssetIds: (
    document: Document,
    newIdFor: (assetId: string) => string | undefined,
  ) => Document;
}

/**
 * Starts cleaning up assets, against the document types given: every stored
 * asset that is unreachable now, and from here on the assets that a closing
 * document lets go of.
 *
 * Returns a function that stops it again. Calling this twice replaces the
 * first registration rather than adding a second.
 */
export function initAssetLifecycle(
  documentTypes: DocumentAssets[],
): () => void {
  stopAssetLifecycle();

  sources = documentTypes;
  const teardown = [
    useAppPersistentStore.subscribe(onPersistentStateChanged),
    cleanupOnceLoaded(),
  ];

  const stop = () => {
    for (const undo of teardown) {
      undo();
    }
    if (stopLifecycle === stop) {
      stopLifecycle = undefined;
    }
  };
  stopLifecycle = stop;

  return stop;
}

export function stopAssetLifecycle() {
  stopLifecycle?.();
}

/**
 * The ids of the assets one document refers to, whatever type of document it
 * is. Answers nothing about a document of a type that was not registered.
 */
export function assetIdsOfDocument(
  state: AppPersistentState,
  documentId: EntityId,
): string[] {
  for (const source of sources) {
    if (source.documentIds(state).includes(documentId)) {
      return source.assetIds(state, documentId);
    }
  }

  return [];
}

/**
 * Points a document at assets stored under different ids than the ones it
 * names. See {@link DocumentAssets.remapAssetIds}.
 *
 * A document of a type that was not registered is returned unchanged.
 */
export function remapDocumentAssetIds(
  document: Document,
  newIdFor: (assetId: string) => string | undefined,
): Document {
  const source = sources.find((candidate) => candidate.type === document.type);
  return source ? source.remapAssetIds(document, newIdFor) : document;
}

/**
 * Deletes any of these assets that nothing can reach any more.
 */
export function cleanupAssets(assetIds: string[]) {
  cleanup(assetIds);
}

/**
 * Deletes the assets that nothing can reach.
 *
 * Calling without `candidates` (doing a full sweep) is only safe when no asset
 * can be in the middle of being attached to a document (e.g. at startup); see
 * the note at the top of this file.
 *
 * @param candidates the assets to consider, or every stored asset if left out.
 * @returns the ids of the assets that were deleted.
 */
export async function cleanupUnreferencedAssets(
  candidates?: Iterable<string>,
): Promise<string[]> {
  if (sources.length === 0) {
    return [];
  }

  // Considered candidates should be gathered before referrers to avoid races
  // when a new asset is created.
  const considered = new Set(candidates ?? (await assetStorage.listAssetIds()));
  const referenced = referencedAssetIds(useAppPersistentStore.getState());

  const unreferenced = [...considered].filter((id) => !referenced.has(id));
  for (const id of unreferenced) {
    await assetStorage.deleteAsset(id);
  }

  return unreferenced;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let sources: DocumentAssets[] = [];
let stopLifecycle: (() => void) | undefined;

/**
 * Cleans up assets once the state has been loaded.
 */
function cleanupOnceLoaded(): () => void {
  const persist = useAppPersistentStore.persist;

  if (!persist || persist.hasHydrated()) {
    cleanup();
    return () => {};
  }

  const unsubscribe = persist.onFinishHydration(() => {
    unsubscribe();
    cleanup();
  });

  return unsubscribe;
}

function onPersistentStateChanged(
  state: AppPersistentState,
  previousState: AppPersistentState,
) {
  const closed = assetsOfClosedDocuments(state, previousState);
  if (closed.size > 0) {
    cleanup(closed);
  }
}

// The assets that the documents which have just left the state referred to.
// They are read from the state as it was, since the documents are gone from
// the state as it is.
function assetsOfClosedDocuments(
  state: AppPersistentState,
  previousState: AppPersistentState,
): Set<string> {
  const assets = new Set<string>();

  for (const source of sources) {
    const open = new Set(source.documentIds(state));

    for (const documentId of source.documentIds(previousState)) {
      if (open.has(documentId)) {
        continue;
      }

      for (const assetId of source.assetIds(previousState, documentId)) {
        assets.add(assetId);
      }
    }
  }

  return assets;
}

// Everything the app can reach: what the open documents refer to now, and what
// their undo histories can bring back.
function referencedAssetIds(state: AppPersistentState): Set<string> {
  const referenced = assetIdsHeldByHistory();

  for (const source of sources) {
    for (const documentId of source.documentIds(state)) {
      for (const id of source.assetIds(state, documentId)) {
        referenced.add(id);
      }
    }
  }

  return referenced;
}

// Cleanup is a background sweep of a database, so nothing waits for it and a
// failure has nowhere to be reported but the console.
function cleanup(candidates?: Iterable<string>) {
  void cleanupUnreferencedAssets(candidates).catch((error: unknown) => {
    console.error("Failed to clean up unreferenced assets:", error);
  });
}

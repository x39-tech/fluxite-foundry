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
// running. The two places where cleanup now runs do not run into this issue,
// but a full-asset cleanup that runs at a time other than startup would need to
// guard against assets being created during that time (race condition between
// the asset going in the database and the state slice that refers to it being
// added).

import { assetStorage } from "./assetStorage";
import { AppPersistentState, EntityId } from "./persistentState";
import { useAppPersistentStore } from "./store";

/**
 * How documents of one type refer to assets.
 *
 * `assetIds` is only ever asked about a document that `documentIds` returned
 * for the same state.
 */
export interface DocumentAssets {
  /** The ids of the documents of this type the state holds. */
  documentIds: (state: AppPersistentState) => EntityId[];
  /** The ids of the assets one of those documents refers to. */
  assetIds: (state: AppPersistentState, documentId: EntityId) => string[];
}

/**
 * Starts cleaning up assets, against the document types given: every stored
 * asset now, and a closing document's own assets from here on.
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
 * Deletes the assets that no open document refers to.
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

function referencedAssetIds(state: AppPersistentState): Set<string> {
  const referenced = new Set<string>();

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

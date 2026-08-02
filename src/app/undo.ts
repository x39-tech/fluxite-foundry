// Document undo and redo implementations

import { applyPatches, Patch } from "immer";
import { AppPersistentState, EntityId } from "./persistentState";
import { HistoryEntry } from "./runtimeState";
import {
  StateChange,
  subscribeToStatePatches,
  updateAppPersistentState,
  updateAppRuntimeState,
  useAppRuntimeStore,
} from "./store";

/**
 * How many changes one document remembers.
 */
export const MAX_HISTORY_ENTRIES = 100;

/** What the history needs from the rest of the app to do its job. */
export interface UndoSources {
  /**
   * The ids of the assets a document refers to in this version of the state.
   * History records them per change so that an asset an undo would bring back
   * is not cleaned up while it can still be reached. See app/assetLifecycle.ts.
   */
  documentAssetIds?: (
    state: AppPersistentState,
    documentId: EntityId,
  ) => string[];
  /**
   * Told about the assets that have been discarded, which nothing may be able
   * to reach any more.
   */
  onAssetsReleased?: (assetIds: string[]) => void;
}

/**
 * Starts recording history.
 *
 * Returns a function that stops it again. Calling this twice replaces the
 * first registration rather than adding a second.
 */
export function initUndo(sources: UndoSources = {}): () => void {
  stopUndo();

  documentAssetIds = sources.documentAssetIds;
  onAssetsReleased = sources.onAssetsReleased;
  const unsubscribe = subscribeToStatePatches(onStateChanged);

  const stop = () => {
    unsubscribe();
    documentAssetIds = undefined;
    onAssetsReleased = undefined;
    if (stopRecording === stop) {
      stopRecording = undefined;
    }
  };
  stopRecording = stop;

  return stop;
}

export function stopUndo() {
  stopRecording?.();
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** The change a document would undo next, if it has one. */
export function useUndoEntry(
  documentId: EntityId | undefined,
): HistoryEntry | undefined {
  return useAppRuntimeStore((state) =>
    documentId === undefined
      ? undefined
      : lastEntry(state.history[documentId]?.undo),
  );
}

/** The change a document would redo next, if it has one. */
export function useRedoEntry(
  documentId: EntityId | undefined,
): HistoryEntry | undefined {
  return useAppRuntimeStore((state) =>
    documentId === undefined
      ? undefined
      : lastEntry(state.history[documentId]?.redo),
  );
}

/**
 * Every asset that a document's history can still reach, whether or not the
 * document refers to it now. An undo can restore a reference to an asset the
 * current state has no path to, so these count as referenced.
 */
export function assetIdsHeldByHistory(): Set<string> {
  const held = new Set<string>();

  for (const history of Object.values(useAppRuntimeStore.getState().history)) {
    for (const entry of [...history.undo, ...history.redo]) {
      for (const assetId of entry.assetIds) {
        held.add(assetId);
      }
    }
  }

  return held;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/** Puts back the last change to a document. Does nothing if there is none. */
export function undo(documentId: EntityId) {
  const entry = lastEntry(
    useAppRuntimeStore.getState().history[documentId]?.undo,
  );
  if (!entry) {
    return;
  }

  replay(entry.inversePatches);

  updateAppRuntimeState((state) => {
    const history = state.history[documentId];
    if (history?.undo.pop()) {
      history.redo.push(entry);
    }
  });
}

/** Makes the last undone change to a document again. */
export function redo(documentId: EntityId) {
  const entry = lastEntry(
    useAppRuntimeStore.getState().history[documentId]?.redo,
  );
  if (!entry) {
    return;
  }

  replay(entry.patches);

  updateAppRuntimeState((state) => {
    const history = state.history[documentId];
    if (history?.redo.pop()) {
      history.undo.push(entry);
    }
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let stopRecording: (() => void) | undefined;
let documentAssetIds: UndoSources["documentAssetIds"];
let onAssetsReleased: UndoSources["onAssetsReleased"];

// Reads the asset ids out of history entries. Called while the entries are
// still drafts of the store, so the ids have to be copied rather than kept.
function collectAssetIds(
  entries: readonly { assetIds: string[] }[],
  into: string[],
) {
  for (const entry of entries) {
    into.push(...entry.assetIds);
  }
}

// An asset that history has let go of is one nothing may be able to reach any
// more, which makes it worth a look. Whether it is really unreachable is not
// this module's decision; see app/assetLifecycle.ts.
function reportReleasedAssets(assetIds: string[]) {
  if (assetIds.length > 0) {
    onAssetsReleased?.(assetIds);
  }
}

function onStateChanged(change: StateChange) {
  // An undo or a redo is history being replayed, not history being made.
  if (!change.isReplay) {
    record(change);
  }

  forgetClosedDocuments(change);
}

function record(change: StateChange) {
  const patches = patchesByDocument(change.patches);
  const inversePatches = patchesByDocument(change.inversePatches);

  const documentIds = new Set([...patches.keys(), ...inversePatches.keys()]);
  if (documentIds.size === 0) {
    return;
  }

  const released: string[] = [];

  updateAppRuntimeState((state) => {
    for (const documentId of documentIds) {
      const history = (state.history[documentId] ??= { undo: [], redo: [] });

      history.undo.push({
        label: change.label,
        patches: patches.get(documentId) ?? [],
        inversePatches: inversePatches.get(documentId) ?? [],
        assetIds: assetIdsAround(change, documentId),
      });

      if (history.undo.length > MAX_HISTORY_ENTRIES) {
        const dropped = history.undo.shift();
        collectAssetIds(dropped ? [dropped] : [], released);
      }

      // Making a change is the point at which what was undone stops being
      // something that can be put back.
      collectAssetIds(history.redo, released);
      history.redo = [];
    }
  });

  reportReleasedAssets(released);
}

// A document's history goes when the document does, however it went: closed by
// the user, or replaced wholesale by a state snapshot being imported. Doing it
// here rather than at the point of closing means no caller has to remember to,
// and no caller has to get the order right relative to asset cleanup.
function forgetClosedDocuments(change: StateChange) {
  const gone = Object.keys(useAppRuntimeStore.getState().history).filter(
    (documentId) => !(documentId in change.state.documents),
  );
  if (gone.length === 0) {
    return;
  }

  const released: string[] = [];

  updateAppRuntimeState((state) => {
    for (const documentId of gone) {
      const history = state.history[EntityId(documentId)];
      collectAssetIds([...history.undo, ...history.redo], released);
      delete state.history[EntityId(documentId)];
    }
  });

  reportReleasedAssets(released);
}

/**
 * Sorts the patches that address the contents of a document by the document
 * they belong to, and drops the rest.
 *
 * A path of ["documents", id] with nothing after it is a whole document coming
 * or going, which belongs to no document's history.
 */
function patchesByDocument(patches: Patch[]): Map<EntityId, Patch[]> {
  const byDocument = new Map<EntityId, Patch[]>();

  for (const patch of patches) {
    if (patch.path.length < 3 || patch.path[0] !== "documents") {
      continue;
    }

    const documentId = EntityId(String(patch.path[1]));
    const forDocument = byDocument.get(documentId);
    if (forDocument) {
      forDocument.push(patch);
    } else {
      byDocument.set(documentId, [patch]);
    }
  }

  return byDocument;
}

// The assets a document referred to on either side of a change. Replaying the
// change in either direction can only reach these.
function assetIdsAround(change: StateChange, documentId: EntityId): string[] {
  if (!documentAssetIds) {
    return [];
  }

  return [
    ...new Set([
      ...documentAssetIds(change.previousState, documentId),
      ...documentAssetIds(change.state, documentId),
    ]),
  ];
}

function replay(patches: Patch[]) {
  updateAppPersistentState(
    (state) => {
      applyPatches(state, patches);
    },
    { isReplay: true },
  );
}

function lastEntry(
  entries: HistoryEntry[] | undefined,
): HistoryEntry | undefined {
  return entries?.[entries.length - 1];
}

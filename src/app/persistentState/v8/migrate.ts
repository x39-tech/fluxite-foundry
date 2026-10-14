import * as V7 from "../v7/state";
import * as V8 from "./state";

// v7 -> v8: structure instances become part of the document.

function migrateDocument(document: V7.Document): V8.Document {
  return {
    ...document,
    structures: {},
    emitterGroupEditors: [],
    emitterGroups: {},
    emitters: {},
    emitterControlGroups: {},
  } as V8.Document;
}

/**
 * Migrates state from V7 to V8.
 *
 * Changes:
 * - Device class documents gain a `structures` table, which holds all structure
 *   instances that we don't support editing so that they survive a round trip.
 * - Added editor state for the Emitters structure.
 */
export function migrateV7toV8(
  state: V7.AppPersistentState,
): V8.AppPersistentState {
  const documents: Record<string, V8.Document> = {};

  for (const [id, document] of Object.entries(state.documents)) {
    documents[id] = migrateDocument(document);
  }

  return {
    ...state,
    documents: documents as Record<V8.EntityId, V8.Document>,
  } as V8.AppPersistentState;
}

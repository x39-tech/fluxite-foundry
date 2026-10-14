import * as V6 from "../v6/state";
import * as V7 from "./state";

// v6 -> v7: structure instances become part of the document.

function migrateDocument(document: V6.Document): V7.Document {
  return {
    ...document,
    structures: {},
    emitterGroupEditors: [],
    emitterGroups: {},
    emitters: {},
    emitterControlGroups: {},
  } as V7.Document;
}

/**
 * Migrates state from V6 to V7.
 *
 * Changes:
 * - Device class documents gain a `structures` table, which holds all structure
 *   instances that we don't support editing so that they survive a round trip.
 * - Added editor state for the Emitters structure.
 */
export function migrateV6toV7(
  state: V6.AppPersistentState,
): V7.AppPersistentState {
  const documents: Record<string, V7.Document> = {};

  for (const [id, document] of Object.entries(state.documents)) {
    documents[id] = migrateDocument(document);
  }

  return {
    ...state,
    documents: documents as Record<V7.EntityId, V7.Document>,
  } as V7.AppPersistentState;
}

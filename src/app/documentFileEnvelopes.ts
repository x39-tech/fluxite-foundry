// When a save file is opened, it needs to be migrated if it was saved using an
// older state version. The app's migration machinery operates on the full
// persistent state rather than individual documents. So, this module supports
// wrapping a document from each state version in a minimal "envelope"
// representing an enclosing persistent state, so that it can be migrated.
//
// Each state version leaves an envelope behind in its own directory, next to
// the schema it belongs to:
//
//     src/app/persistentState/v5/envelope.json

import { EntityId } from "./persistentState";

/**
 * The id the document is given inside the envelope. It lives only as long as
 * the migration does; an opened document is given a fresh id.
 */
export const ENVELOPED_DOCUMENT_ID = EntityId("enveloped-document");

/** Wraps one document in the smallest valid state of a single version. */
export type DocumentEnvelope = (document: unknown) => unknown;

/** The oldest state version that supported save files. */
export const MIN_SAVE_FILE_STATE_VERSION = 5;

/** An envelope file, as it sits in its version's directory. */
export interface EnvelopeFile {
  stateVersion: number;
  /** A valid state of that version, with no documents in it yet. */
  state: Record<string, unknown>;
}

/** The envelope of each state version that has one, keyed by version. */
export const DOCUMENT_ENVELOPES: Record<number, DocumentEnvelope> =
  loadEnvelopeFiles();

/**
 * The envelope for one state version, or undefined if this build cannot
 * produce a state of that version.
 */
export function envelopeForVersion(
  version: number,
): DocumentEnvelope | undefined {
  return DOCUMENT_ENVELOPES[version];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Puts a document into a state envelope. */
function envelopeAround(state: object): DocumentEnvelope {
  return (document) => ({
    // Cloned because the envelope files are shared, and a migration is free to
    // do as it likes with the state it is handed.
    ...structuredClone(state),
    documents: { [ENVELOPED_DOCUMENT_ID]: document },
  });
}

function loadEnvelopeFiles(): Record<number, DocumentEnvelope> {
  const files = import.meta.glob("./persistentState/v*/envelope.json", {
    eager: true,
    import: "default",
  }) as Record<string, EnvelopeFile>;

  const envelopes: Record<number, DocumentEnvelope> = {};

  for (const [path, file] of Object.entries(files)) {
    const version = Number(/\/v(\d+)\/envelope\.json$/.exec(path)?.[1]);
    if (!version) {
      throw new Error(
        `Envelope ${path} is not in a vN directory, so there is no telling what version it is.`,
      );
    }

    if (file.stateVersion !== version) {
      throw new Error(
        `Envelope ${path} says it is a v${file.stateVersion} state, but it is filed under v${version}.`,
      );
    }

    envelopes[version] = envelopeAround(file.state);
  }

  return envelopes;
}

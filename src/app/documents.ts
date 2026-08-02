// Working with the open documents (each open document in the app is also
// referred to as an editor).
//
// A document is one device class, one library or one system.
//
// Code that needs a specific kind of document asks for it by type and is handed
// that arm of the union, narrowed. See features/deviceClassEditor/state.ts for
// what that looks like from the other side.

import { Draft } from "immer";
import { useShallow } from "zustand/react/shallow";
import {
  AppPersistentState,
  Document,
  DocumentType,
  EntityId,
} from "./persistentState";
import { useAppPersistentStore, updateAppPersistentState } from "./store";

/** The arm of the document union that `type` names. */
export type DocumentOfType<T extends DocumentType> = Extract<
  Document,
  { type: T }
>;

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function getDocument(
  state: AppPersistentState,
  id: EntityId | undefined,
): Document | undefined {
  return id === undefined ? undefined : state.documents[id];
}

export function getCurrentDocument(
  state: AppPersistentState,
): Document | undefined {
  return getDocument(state, state.session.selectedDocumentId);
}

/** The ids of every document of the given type the state holds. */
export function documentIdsOfType<T extends DocumentType>(
  state: AppPersistentState,
  type: T,
): EntityId[] {
  return Object.entries(state.documents)
    .filter(([, document]) => document.type === type)
    .map(([id]) => EntityId(id));
}

/** One document by id, if it is of the given type. */
export function documentOfType<T extends DocumentType>(
  state: AppPersistentState,
  id: EntityId,
  type: T,
): DocumentOfType<T> | undefined {
  const document = state.documents[id];
  return document?.type === type ? (document as DocumentOfType<T>) : undefined;
}

/**
 * The current document, if there is one and it is of the given type. Returns
 * undefined when the current document is of some other type.
 */
export function getCurrentDocumentOfType<T extends DocumentType>(
  state: AppPersistentState,
  type: T,
): DocumentOfType<T> | undefined {
  const document = getCurrentDocument(state);
  return document?.type === type ? (document as DocumentOfType<T>) : undefined;
}

export function useCurrentDocumentId(): EntityId | undefined {
  return useAppPersistentStore((state) => state.session.selectedDocumentId);
}

export function useCurrentDocumentType(): DocumentType | undefined {
  return useAppPersistentStore((state) => getCurrentDocument(state)?.type);
}

/**
 * Selects part of the current document, when it is of the given type.
 *
 * As with any store selector, the reducer must not build a new object or array
 * each time it runs; use {@link useCurrentDocumentPartShallow} for that.
 */
export function useCurrentDocumentPart<T extends DocumentType, R>(
  type: T,
  reducer: (document: DocumentOfType<T>) => R,
): R | undefined {
  return useAppPersistentStore((state) => {
    const document = getCurrentDocumentOfType(state, type);
    return document ? reducer(document) : undefined;
  });
}

/** {@link useCurrentDocumentPart}, comparing the result shallowly. */
export function useCurrentDocumentPartShallow<T extends DocumentType, R>(
  type: T,
  reducer: (document: DocumentOfType<T>) => R,
): R | undefined {
  return useAppPersistentStore(
    useShallow((state) => {
      const document = getCurrentDocumentOfType(state, type);
      return document ? reducer(document) : undefined;
    }),
  );
}

/** The window layout of a document, as a stringified FlexLayout model. */
export function useDocumentLayout(
  id: EntityId | undefined,
): string | undefined {
  return useAppPersistentStore((state) =>
    id === undefined ? undefined : state.session.layouts[id],
  );
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Updates the current document, when it is of the given type. Does nothing when
 * no document is selected or the selected one is of another type.
 *
 * The label is what the change is called in the undo menu, in the imperative
 * ("Add Parameter"), because every change to a document is undoable. Use
 * `asOneChange` if you need to group multiple actions into one undo entry.
 */
export function updateCurrentDocumentOfType<T extends DocumentType>(
  type: T,
  label: string,
  updater: (document: Draft<DocumentOfType<T>>) => void,
) {
  updateAppPersistentState(
    (state) => {
      const document = getCurrentDocumentOfType(state, type);
      if (!document) {
        return;
      }

      updater(document as Draft<DocumentOfType<T>>);
    },
    { label },
  );
}

export function setSelectedDocument(id: EntityId | undefined) {
  updateAppPersistentState((state) => {
    state.session.selectedDocumentId = id;
  });
}

export function setDocumentLayout(id: EntityId, layout: string) {
  updateAppPersistentState((state) => {
    state.session.layouts[id] = layout;
  });
}

/**
 * Closes a document: drops it from the state along with the session's memory of
 * it, and moves the selection to a neighbouring tab.
 *
 * The assets the document referred to are not deleted here. They are cleaned
 * up once the document has gone, by app/assetLifecycle.ts.
 */
export function closeDocument(id: EntityId) {
  updateAppPersistentState((state) => {
    const index = state.session.openDocuments.indexOf(id);
    if (index === -1) {
      return;
    }

    state.session.openDocuments.splice(index, 1);
    delete state.session.layouts[id];
    delete state.documents[id];

    if (state.session.selectedDocumentId === id) {
      // Select the tab that took this one's place, or the new last tab when it
      // was the last one.
      state.session.selectedDocumentId =
        state.session.openDocuments[index] ??
        state.session.openDocuments[index - 1];
    }
  });
}

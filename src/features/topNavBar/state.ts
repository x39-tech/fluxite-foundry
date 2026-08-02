import { useShallow } from "zustand/shallow";
import { useAppPersistentStore, updateAppPersistentState } from "app/store";
import {
  AppPersistentState,
  DeviceClassDocument,
  DocumentType,
  documentTypes,
  EntityId,
} from "app/persistentState";
import {
  closeDocument,
  documentIdsOfType,
  documentOfType,
  setSelectedDocument,
} from "app/documents";
import { newEntityId } from "app/stateUtils";
import { getNewDeviceClassEditor } from "features/deviceClassEditor/import";
import { getDefaultWindowLayout } from "utils/utils";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** The open documents, in tab order. */
export function useOpenDocumentIds(): EntityId[] {
  return useAppPersistentStore((state) => state.session.openDocuments);
}

export function useSelectedDocumentId(): EntityId | undefined {
  return useAppPersistentStore((state) => state.session.selectedDocumentId);
}

export function useDeviceClassDocuments(): Record<
  EntityId,
  DeviceClassDocument
> {
  return useAppPersistentStore(
    useShallow((state) => {
      const documents: Record<EntityId, DeviceClassDocument> = {};
      for (const id of documentIdsOfType(state, documentTypes.DEVICE_CLASS)) {
        const document = documentOfType(state, id, documentTypes.DEVICE_CLASS);
        if (document) {
          documents[id] = document;
        }
      }
      return documents;
    }),
  );
}

/** The name to show on each open document's tab, in tab order. */
export function useDocumentNames(): string[] {
  return useAppPersistentStore(
    useShallow((state) => getOpenDocumentNames(state)),
  );
}

/** The type of each open document, in tab order. */
export function useDocumentTypes(): (DocumentType | undefined)[] {
  return useAppPersistentStore(
    useShallow((state) => getOpenDocumentTypes(state)),
  );
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function createDeviceClassEditor() {
  updateAppPersistentState((state) => {
    const existingIds = Object.values(state.documents)
      .filter((document) => document.type === documentTypes.DEVICE_CLASS)
      .map((document) => document.deviceClassId);

    const newId = newEntityId();
    state.documents[newId] = getNewDeviceClassEditor(
      existingIds,
      state.appSettings.locale,
    );
    state.session.openDocuments.push(newId);
    state.session.layouts[newId] = JSON.stringify(getDefaultWindowLayout());
    state.session.selectedDocumentId = newId;
  });
}

export { setSelectedDocument, closeDocument };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOpenDocumentNames(state: AppPersistentState): string[] {
  return state.session.openDocuments.map((id) => {
    const document = state.documents[id];
    if (!document) {
      return "";
    }

    switch (document.type) {
      case documentTypes.DEVICE_CLASS:
        return document.basicData.modelName;
      default:
        return "";
    }
  });
}

function getOpenDocumentTypes(
  state: AppPersistentState,
): (DocumentType | undefined)[] {
  return state.session.openDocuments.map((id) => {
    const document = state.documents[id];
    if (!document) {
      return undefined;
    }

    return document.type;
  });
}

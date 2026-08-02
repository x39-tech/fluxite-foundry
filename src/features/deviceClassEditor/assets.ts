// Which assets a device class document refers to. See app/assetLifecycle.ts

import { DocumentAssets } from "app/assetLifecycle";
import { documentTypes } from "app/persistentState";
import { documentIdsOfType, documentOfType } from "app/documents";

export const deviceClassAssets: DocumentAssets = {
  type: documentTypes.DEVICE_CLASS,
  documentIds: (state) => documentIdsOfType(state, documentTypes.DEVICE_CLASS),
  assetIds: (state, documentId) => {
    const document = documentOfType(
      state,
      documentId,
      documentTypes.DEVICE_CLASS,
    );
    return document ? Object.values(document.resourceAssets) : [];
  },
  remapAssetIds: (document, newIdFor) => {
    if (document.type !== documentTypes.DEVICE_CLASS) {
      return document;
    }

    const resourceAssets: Record<string, string> = {};
    for (const [resourceKey, assetId] of Object.entries(
      document.resourceAssets,
    )) {
      const newId = newIdFor(assetId);
      if (newId !== undefined) {
        resourceAssets[resourceKey] = newId;
      }
    }

    return { ...document, resourceAssets };
  },
};

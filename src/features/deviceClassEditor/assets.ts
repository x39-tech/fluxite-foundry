// Which assets a device class document refers to. See app/assetLifecycle.ts

import { DocumentAssets } from "app/assetLifecycle";
import { EntityId } from "app/persistentState";

export const deviceClassAssets: DocumentAssets = {
  documentIds: (state) => Object.keys(state.deviceClassEditors) as EntityId[],
  assetIds: (state, documentId) =>
    Object.values(state.deviceClassEditors[documentId].resourceAssets),
};

// Side effects the device class editor drives from the persistent state.

import { DmxDriver, DelverError } from "@cpwg-community/delver";
import {
  AppPersistentState,
  DeviceClassDocument,
  documentTypes,
  EntityId,
} from "app/persistentState";
import {
  useAppPersistentStore,
  useAppRuntimeStore,
  updateAppRuntimeState,
} from "app/store";
import { documentIdsOfType, documentOfType } from "app/documents";
import { DmxController } from "app/runtimeState";
import { exportDeviceClass } from "./export";
import { resolveDmxSerializerId } from "./dmxEditor/modes";
import {
  editorRuntimeDraft,
  editorRuntimeField,
  forgetClosedEditors,
  subscribeToEditorRuntimeField,
  updateEditorRuntimeState,
} from "./runtimeState";

type DeviceClassDocuments = Record<EntityId, DeviceClassDocument>;

let stopEffects: (() => void) | undefined;

/**
 * Starts the device class editor's effects and brings them up to date with the
 * state.
 */
export function initDeviceClassEditorEffects() {
  stopDeviceClassEditorEffects();

  const unsubscribePersistent = useAppPersistentStore.subscribe(
    onPersistentStateChanged,
  );
  const unsubscribeRuntime = subscribeToEditorRuntimeField(
    "dmxControllerSerializer",
    onControllerSerializersChanged,
  );
  const stop = () => {
    unsubscribePersistent();
    unsubscribeRuntime();
    if (stopEffects === stop) {
      stopEffects = undefined;
    }
  };
  stopEffects = stop;

  syncDmxDrivers(deviceClasses(useAppPersistentStore.getState()), {});
}

export function stopDeviceClassEditorEffects() {
  stopEffects?.();
}

/** Replaces a document's DMX test driver with a new one. */
export function resetDmxDriver(documentId: EntityId) {
  const editor = documentOfType(
    useAppPersistentStore.getState(),
    documentId,
    documentTypes.DEVICE_CLASS,
  );
  if (!editor) {
    return;
  }

  const controller = createDmxDriver(documentId, editor);
  updateEditorRuntimeState(documentId, (state) => {
    state.dmxController = controller;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function onPersistentStateChanged(
  state: AppPersistentState,
  previousState: AppPersistentState,
) {
  syncDmxDrivers(deviceClasses(state), deviceClasses(previousState));
  forgetClosedEditors(state.documents);
}

// Rebuilds the driver of every document whose test controller was switched to
// another serializer.
function onControllerSerializersChanged(changedIds: EntityId[]) {
  const editors = deviceClasses(useAppPersistentStore.getState());
  const changed = new Map<EntityId, DmxController | undefined>();
  for (const id of changedIds) {
    const editor = editors[id];
    if (editor) {
      changed.set(id, createDmxDriver(id, editor));
    }
  }

  setDmxControllers(changed);
}

function deviceClasses(state: AppPersistentState): DeviceClassDocuments {
  const documents: DeviceClassDocuments = {};

  for (const id of documentIdsOfType(state, documentTypes.DEVICE_CLASS)) {
    const document = documentOfType(state, id, documentTypes.DEVICE_CLASS);
    if (document) {
      documents[id] = document;
    }
  }

  return documents;
}

// Rebuilds the DMX test driver of every open document whose content changed.
// A document with no DMX serializer has nothing to build a driver from and so
// has no driver. The driver of a closed document goes with the rest of its
// runtime state, in forgetClosedEditors.
function syncDmxDrivers(
  editors: DeviceClassDocuments,
  previousEditors: DeviceClassDocuments,
) {
  const changed = new Map<EntityId, DmxController | undefined>();

  for (const [id, editor] of Object.entries(editors) as [
    EntityId,
    DeviceClassDocument,
  ][]) {
    if (editor !== previousEditors[id]) {
      changed.set(id, createDmxDriver(id, editor));
    }
  }

  setDmxControllers(changed);
}

function setDmxControllers(changed: Map<EntityId, DmxController | undefined>) {
  if (changed.size === 0) {
    return;
  }

  updateAppRuntimeState((state) => {
    for (const [id, controller] of changed) {
      editorRuntimeDraft(state, id).dmxController = controller;
    }
  });
}

// Builds the test driver for one document.
function createDmxDriver(
  documentId: EntityId,
  editor: DeviceClassDocument,
): DmxController | undefined {
  const serializerId = resolveDmxSerializerId(
    editor.dmxSerializers,
    editorRuntimeField(
      useAppRuntimeStore.getState(),
      documentId,
      "dmxControllerSerializer",
    ),
  );
  const serializer = serializerId && editor.dmxSerializers[serializerId];
  if (!serializer || Object.keys(serializer.chunks).length === 0) {
    return undefined;
  }

  try {
    // The driver is exported only with the serializer it is built from, so
    // that a problem in another mode doesn't stop this one from compiling.
    const deviceClass = exportDeviceClass({
      ...editor,
      dmxSerializers: { [serializerId]: serializer },
    });
    return {
      state: "available",
      driver: new DmxDriver(deviceClass, serializer.codexId),
    };
  } catch (e) {
    return { state: "error", error: e as DelverError };
  }
}

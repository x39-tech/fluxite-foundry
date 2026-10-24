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
import { AppRuntimeState, DmxController } from "app/runtimeState";
import { exportDeviceClass } from "./export";
import { resolveDmxSerializerId } from "./dmxEditor/modes";

// Parts of a document the DMX driver does not read. The window layout used to
// be one of these; it is session state now and never reaches this module.
const NON_DRIVER_FIELDS = new Set<keyof DeviceClassDocument>([]);

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
  const unsubscribeRuntime = useAppRuntimeStore.subscribe(
    onRuntimeStateChanged,
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
  updateAppRuntimeState((state) => {
    if (controller) {
      state.dmxControllers[documentId] = controller;
    } else {
      delete state.dmxControllers[documentId];
    }
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
}

// Rebuilds the driver of every document whose test controller was switched to
// another serializer.
function onRuntimeStateChanged(
  state: AppRuntimeState,
  previousState: AppRuntimeState,
) {
  const selections = state.dmxControllerSerializers;
  const previousSelections = previousState.dmxControllerSerializers;
  if (selections === previousSelections) {
    return;
  }

  const editors = deviceClasses(useAppPersistentStore.getState());
  const changed = new Map<EntityId, DmxController | undefined>();
  for (const id of documentIds(selections, previousSelections)) {
    const editor = editors[id];
    if (editor && selections[id] !== previousSelections[id]) {
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

// Rebuilds the DMX test driver of every document whose content changed, and
// removes the driver of a document that closed. A document with no DMX
// serializer has nothing to build a driver from and so has no entry.
function syncDmxDrivers(
  editors: DeviceClassDocuments,
  previousEditors: DeviceClassDocuments,
) {
  const changed = new Map<EntityId, DmxController | undefined>();

  for (const id of documentIds(editors, previousEditors)) {
    const editor = editors[id];
    if (driverInputsEqual(editor, previousEditors[id])) {
      continue;
    }

    changed.set(id, editor ? createDmxDriver(id, editor) : undefined);
  }

  setDmxControllers(changed);
}

function setDmxControllers(changed: Map<EntityId, DmxController | undefined>) {
  if (changed.size === 0) {
    return;
  }

  updateAppRuntimeState((state) => {
    for (const [id, controller] of changed) {
      if (controller) {
        state.dmxControllers[id] = controller;
      } else {
        delete state.dmxControllers[id];
      }
    }
  });
}

function documentIds(
  current: Record<EntityId, unknown>,
  previous: Record<EntityId, unknown>,
): Set<EntityId> {
  return new Set([
    ...Object.keys(current),
    ...Object.keys(previous),
  ]) as Set<EntityId>;
}

// Compares the two documents field by field. Immer shares the structure a
// change did not touch, so an untouched table is referentially equal in both.
function driverInputsEqual(
  editor: DeviceClassDocument | undefined,
  previousEditor: DeviceClassDocument | undefined,
): boolean {
  if (editor === previousEditor) {
    return true;
  }
  if (!editor || !previousEditor) {
    return false;
  }

  const fields = new Set([
    ...Object.keys(editor),
    ...Object.keys(previousEditor),
  ]) as Set<keyof DeviceClassDocument>;

  for (const field of fields) {
    if (NON_DRIVER_FIELDS.has(field)) {
      continue;
    }
    if (editor[field] !== previousEditor[field]) {
      return false;
    }
  }

  return true;
}

// Builds the test driver for one document.
function createDmxDriver(
  documentId: EntityId,
  editor: DeviceClassDocument,
): DmxController | undefined {
  const serializerId = resolveDmxSerializerId(
    editor.dmxSerializers,
    useAppRuntimeStore.getState().dmxControllerSerializers[documentId],
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

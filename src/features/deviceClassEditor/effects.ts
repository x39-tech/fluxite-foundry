// Side effects the device class editor drives from the persistent state.

import { DmxDriver, DelverError } from "@cpwg-community/delver";
import {
  AppPersistentState,
  DeviceClassDocument,
  documentTypes,
  EntityId,
} from "app/persistentState";
import { useAppPersistentStore, updateAppRuntimeState } from "app/store";
import { documentIdsOfType, documentOfType } from "app/documents";
import { DmxController } from "app/runtimeState";
import { exportDeviceClass } from "./export";
import { firstDmxSerializer } from "./dmxEditor/firstSerializer";

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

  const unsubscribe = useAppPersistentStore.subscribe(onPersistentStateChanged);
  const stop = () => {
    unsubscribe();
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

  const controller = createDmxDriver(editor);
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

    changed.set(id, editor ? createDmxDriver(editor) : undefined);
  }

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
  editors: DeviceClassDocuments,
  previousEditors: DeviceClassDocuments,
): Set<EntityId> {
  return new Set([
    ...Object.keys(editors),
    ...Object.keys(previousEditors),
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
  editor: DeviceClassDocument,
): DmxController | undefined {
  const serializer = firstDmxSerializer(editor);
  if (!serializer || Object.keys(serializer.chunks).length === 0) {
    return undefined;
  }

  try {
    const deviceClass = exportDeviceClass(editor);
    return {
      state: "available",
      driver: new DmxDriver(deviceClass, serializer.codexId),
    };
  } catch (e) {
    return { state: "error", error: e as DelverError };
  }
}

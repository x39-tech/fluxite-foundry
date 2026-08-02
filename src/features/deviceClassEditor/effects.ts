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

// Parts of a document the DMX driver does not read. The window layout used to
// be one of these; it is session state now and never reaches this module.
const NON_DRIVER_FIELDS = new Set<keyof DeviceClassDocument>([]);

// The name the exported device class gives its DMX serializer.
const DMX_SERIALIZER = "dmx";

type DeviceClassDocuments = Record<EntityId, DeviceClassDocument>;

let stopEffects: (() => void) | undefined;

/**
 * Starts the device class editor's effects and brings them up to date with the
 * state as it stands.
 *
 * Returns a function that stops them again. Calling this twice replaces the
 * first registration rather than adding a second.
 */
export function initDeviceClassEditorEffects(): () => void {
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

  return stop;
}

export function stopDeviceClassEditorEffects() {
  stopEffects?.();
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
  if (!editor.dmxSerializer) {
    return undefined;
  }

  try {
    const deviceClass = exportDeviceClass(editor);
    if (!deviceClass.serializers?.[DMX_SERIALIZER]) {
      return undefined;
    }

    return {
      state: "available",
      driver: new DmxDriver(deviceClass, DMX_SERIALIZER),
    };
  } catch (e) {
    return { state: "error", error: e as DelverError };
  }
}

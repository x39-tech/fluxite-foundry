import { nanoid } from "nanoid";
import { useAppPersistentStore, updateAppPersistentState } from "app/store";
import {
  AppPersistentState,
  DeviceClassEditorState,
  EditorType,
  OpenEditor,
  OpenEditors,
} from "app/state";

import { DeviceClass, EstaDmx } from "e173";
import { getDefaultWindowLayout, getUniqueItemId } from "utils/utils";
import { getDefaultDeviceClass } from "udr/udr";
import {
  getCurrentEditor,
  updateDmxController,
} from "features/deviceClassEditor/state";

interface OpenEditorWithName extends OpenEditor {
  name: string;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useOpenEditors(): OpenEditors {
  return useAppPersistentStore((state) => state.openEditors);
}

export function useDeviceClassEditors(): {
  [key: string]: DeviceClassEditorState;
} {
  return useAppPersistentStore((state) => state.deviceClassEditors);
}

export function useEditorNames(): string[] {
  return useAppPersistentStore((state) => getOpenEditorModelNames(state));
}

export function useOpenDeviceClassEditorsWithNames(): OpenEditorWithName[] {
  return useAppPersistentStore((state) =>
    state.openEditors.editors.reduce((accum: OpenEditorWithName[], value) => {
      if (value.type == EditorType.DEVICE_CLASS) {
        const editorState = state.deviceClassEditors[value.id];
        if (editorState) {
          accum.push({ ...value, name: editorState.basicData.info.model.name });
        }
      }
      return accum;
    }, []),
  );
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function createDeviceClassEditor() {
  updateAppPersistentState((state) => {
    const deviceClassEditors = state.deviceClassEditors;
    const openEditors = state.openEditors;

    const existingIds = openEditors.editors.map(
      (editor) => deviceClassEditors[editor.id].deviceClassId,
    );

    const newId = nanoid();
    deviceClassEditors[newId] = getNewDeviceClassEditor(existingIds);
    openEditors.editors.push({ type: EditorType.DEVICE_CLASS, id: newId });
    openEditors.selectedEditor = openEditors.editors.length - 1;

    updateDmxController(deviceClassEditors[newId]);
  });
}

export function setSelectedEditor(index: number) {
  updateAppPersistentState((state) => {
    state.openEditors.selectedEditor = index;
    updateDmxController(getCurrentEditor(state)!);
  });
}

export function importDeviceClassEditor(id: string, deviceClass: DeviceClass) {
  updateAppPersistentState((state) => {
    const deviceClassEditors = state.deviceClassEditors;
    const openEditors = state.openEditors;

    const newId = nanoid();
    deviceClassEditors[newId] = getImportedDeviceClassEditor(id, deviceClass);
    openEditors.editors.push({ type: EditorType.DEVICE_CLASS, id: newId });
    openEditors.selectedEditor = openEditors.editors.length - 1;

    updateDmxController(deviceClassEditors[newId]);
  });
}

export function deleteEditor(index: number) {
  updateAppPersistentState((state) => {
    const editors = state.openEditors;
    if (index < 0 || index >= editors.editors.length) {
      return;
    }

    const editor = editors.editors[index];
    if (editor.type == EditorType.DEVICE_CLASS) {
      delete state.deviceClassEditors[editor.id];
    }

    const newIndex: number =
      editors.editors.length === 1
        ? -1
        : index === editors.editors.length - 1
          ? index - 1
          : index;

    editors.selectedEditor = newIndex;
    editors.editors.splice(index, 1);
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOpenEditorModelNames(state: AppPersistentState): string[] {
  return state.openEditors.editors.map((editor) => {
    switch (editor.type) {
      case EditorType.DEVICE_CLASS: {
        return state.deviceClassEditors[editor.id].basicData.info.model.name;
      }
      default:
        return "";
    }
  });
}

function getNewDeviceClassEditor(
  existingEditorIds: string[],
): DeviceClassEditorState {
  const deviceClassId = getUniqueItemId(existingEditorIds, "super-light");

  return getImportedDeviceClassEditor(
    deviceClassId,
    getDefaultDeviceClass(deviceClassId),
  );
}

function getImportedDeviceClassEditor(
  id: string,
  udr: DeviceClass,
): DeviceClassEditorState {
  let dmx: EstaDmx | undefined = undefined;

  if (udr.serializers) {
    for (const value of Object.values(udr.serializers)) {
      // TODO remove hardcoded values
      if (value.library == "org.esta.lib.core" && value.class == "esta-dmx") {
        // It is validated by the E1.73 library
        dmx = value.default as EstaDmx;
      }
    }
  }

  return {
    deviceClassId: id,
    basicData: {
      ...udr,
    },
    libraries: udr.libraries,
    deviceLibrary: udr.deviceLibrary || {
      parameterClasses: {},
      structureClasses: {},
      serializerClasses: {},
    },
    parameters: {
      parameters: udr.parameters || {},
      itemEditorLayout: Object.keys(udr.parameters || {}).map((id) => {
        return { id: nanoid(), udrId: id };
      }),
    },
    structures: {
      structures: udr.structures || {},
      itemEditorLayout: Object.keys(udr.structures || {}).map((id) => {
        return { id: nanoid(), udrId: id };
      }),
    },
    dmx: {
      udr: dmx ? dmx : { chunks: {} },
    },
    localizations: udr.localizations || {},
    windowLayout: getDefaultWindowLayout(),
  };
}

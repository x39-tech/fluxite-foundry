import { nanoid } from "nanoid";
import { useAppStore } from "app/store";
import {
  AppState,
  DeviceClassEditorState,
  EditorType,
  OpenEditor,
  OpenEditors,
} from "app/state";
import { DeviceClass } from "e173";
import { getUniqueItemId } from "utils/utils";
import { getDefaultDeviceClass } from "udr/udr";

interface OpenEditorWithName extends OpenEditor {
  name: string;
}

export function useOpenEditors(): OpenEditors {
  return useAppStore((state) => state.openEditors);
}

export function useDeviceClassEditors(): {
  [key: string]: DeviceClassEditorState;
} {
  return useAppStore((state) => state.deviceClassEditors);
}

export function useEditorNames(): string[] {
  return useAppStore((state) => getOpenEditorModelNames(state));
}

export function useOpenDeviceClassEditorsWithNames(): OpenEditorWithName[] {
  return useAppStore((state) =>
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

export function createDeviceClassEditor() {
  useAppStore.setState((state) => {
    const deviceClassEditors = state.deviceClassEditors;
    const openEditors = state.openEditors;

    const existingIds = openEditors.editors.map(
      (editor) => deviceClassEditors[editor.id].deviceClassId,
    );

    const newId = nanoid();
    deviceClassEditors[newId] = getNewDeviceClassEditor(existingIds);
    openEditors.editors.push({ type: EditorType.DEVICE_CLASS, id: newId });
    openEditors.selectedEditor = openEditors.editors.length - 1;
  });
}

export function setSelectedEditor(index: number) {
  useAppStore.setState((state) => {
    state.openEditors.selectedEditor = index;
  });
}

export function importDeviceClassEditor(id: string, deviceClass: DeviceClass) {
  useAppStore.setState((state) => {
    const deviceClassEditors = state.deviceClassEditors;
    const openEditors = state.openEditors;

    const newId = nanoid();
    deviceClassEditors[newId] = getImportedDeviceClassEditor(id, deviceClass);
    openEditors.editors.push({ type: EditorType.DEVICE_CLASS, id: newId });
    openEditors.selectedEditor = openEditors.editors.length - 1;
  });
}

export function deleteEditor(index: number) {
  useAppStore.setState((state) => {
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

function getOpenEditorModelNames(state: AppState): string[] {
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
  return {
    deviceClassId: id,
    basicData: {
      ...udr,
    },
    libraries: udr.libraries,
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
    windowLayout: {
      type: "row",
      weight: 100,
      id: nanoid(),
      children: [
        {
          type: "tabset",
          weight: 50,
          id: nanoid(),
          children: [
            {
              type: "tab",
              name: "Parameters Editor",
              component: "parametersEditor",
              id: nanoid(),
            },
          ],
        },
        {
          type: "tabset",
          weight: 50,
          id: nanoid(),
          children: [
            {
              type: "tab",
              name: "Device Info Editor",
              component: "deviceInfoEditor",
              id: nanoid(),
            },
          ],
        },
      ],
    },
  };
}

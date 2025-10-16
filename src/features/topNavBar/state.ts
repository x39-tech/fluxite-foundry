import { nanoid } from "nanoid";
import { useShallow } from "zustand/shallow";
import JSZip from "jszip";
import { DeviceClass, E173Archive, EstaDmx, Resource } from "e173";
import { useAppPersistentStore, updateAppPersistentState } from "app/store";
import {
  AppPersistentState,
  DeviceClassEditorState,
  EditorType,
  OpenEditors,
} from "app/state";
import { OrgId, getDefaultWindowLayout, getUniqueItemId } from "utils/utils";
import { getDefaultDeviceClass } from "udr/udr";
import {
  getCurrentEditor,
  updateDmxController,
} from "features/deviceClassEditor/state";
import { assetStorage } from "app/assetStorage";

export interface ArchiveToImport {
  archiveFile: File;
  archive: E173Archive;
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
  return useAppPersistentStore(
    useShallow((state) => getOpenEditorModelNames(state)),
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

export async function importDeviceClassEditor(
  orgId: OrgId,
  id: string,
  version: string,
  deviceClass: DeviceClass,
  archive?: ArchiveToImport,
) {
  const newDeviceClass = archive
    ? await getImportedDeviceClassEditorWithAssets(
        orgId,
        id,
        version,
        deviceClass,
        archive,
      )
    : getImportedDeviceClassEditor(orgId, id, version, deviceClass);

  updateAppPersistentState((state) => {
    const deviceClassEditors = state.deviceClassEditors;
    const openEditors = state.openEditors;

    const newId = nanoid();
    deviceClassEditors[newId] = newDeviceClass;
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
  // TODO: This only needs to be unique among the same OrgId now
  const deviceClassId = getUniqueItemId(existingEditorIds, "super-light");
  const orgId = useAppPersistentStore.getState().appSettings.orgId;

  return getImportedDeviceClassEditor(
    orgId,
    deviceClassId,
    "1.0.0",
    getDefaultDeviceClass(deviceClassId),
  );
}

function getImportedDeviceClassEditor(
  orgId: OrgId,
  id: string,
  version: string,
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
    orgId,
    deviceClassId: id,
    deviceClassVersion: version,
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
    resources: {
      resources: udr.resources || {},
      itemEditorLayout: Object.keys(udr.resources || {}).map((id) => {
        return { id: nanoid(), udrId: id };
      }),
      resourceAssets: {},
    },
    commands: {
      commands: udr.commands || {},
      itemEditorLayout: Object.keys(udr.commands || {}).map((id) => {
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

async function getImportedDeviceClassEditorWithAssets(
  orgId: OrgId,
  id: string,
  version: string,
  udr: DeviceClass,
  archive: ArchiveToImport,
) {
  const editor = getImportedDeviceClassEditor(orgId, id, version, udr);
  editor.resources.resourceAssets = await loadResourceAssets(
    id,
    version,
    archive,
    editor.resources.resources,
  );
  return editor;
}

async function loadResourceAssets(
  id: string,
  version: string,
  archive: ArchiveToImport,
  resources: Record<string, Resource>,
): Promise<Record<string, string>> {
  const resourceAssets: Record<string, string> = {};

  let zip;
  try {
    zip = await JSZip.loadAsync(archive.archiveFile);
  } catch (_e) {
    return resourceAssets;
  }

  const assetsDir =
    archive.archive.e173archive.deviceClasses?.[id]?.[version]?.assetsDirectory;
  if (!assetsDir) {
    return resourceAssets;
  }

  for (const resource of Object.values(resources)) {
    if (resource.default) {
      try {
        const filePath = `${assetsDir}/${resource.default}`;

        const zipFile = zip.file(filePath);
        if (!zipFile) {
          throw new Error("Resource file did not exist in archive");
        }

        const fileContent = await zipFile.async("arraybuffer");
        const assetId = await assetStorage.storeAsset(
          fileContent,
          resource.mediaType,
        );
        resourceAssets[resource.default] = assetId;
      } catch (_e) {
        // TODO error handling
        continue;
      }
    }
  }

  return resourceAssets;
}

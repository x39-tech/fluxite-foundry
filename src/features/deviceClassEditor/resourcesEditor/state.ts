import { Draft } from "immer";
import { nanoid } from "nanoid";
import { Access, Lifetime, Resource } from "e173";
import { useUdrDatabase } from "app/store";
import { ItemEditor } from "app/state";
import { assetStorage } from "app/assetStorage";
import {
  lookupDeviceResourceClass,
  lookupResourceClass,
  ResolvedResourceClass,
} from "udr/udrDatabase";
import {
  updateCurrentEditor,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
  useDeviceLibrary,
  useDeviceLocalizations,
  useLibraries,
} from "../state";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useResourceIds(): string[] {
  const ids = useCurrentEditorPartShallow((state) =>
    Object.keys(state.resources.resources),
  );
  return ids ?? [];
}

export function useResourceEditors(): ItemEditor[] {
  const editors = useCurrentEditorPartShallow((state) =>
    state.resources.itemEditorLayout.filter(
      (editor) => editor.udrId in state.resources.resources,
    ),
  );
  return editors ?? [];
}

export function useResource(id: string): Resource | undefined {
  return useCurrentEditorPart((state) => state.resources.resources[id]);
}

export function useResourceClass(
  resource?: Resource,
): ResolvedResourceClass | undefined {
  const database = useUdrDatabase();
  const libraries = useLibraries();
  const deviceLibrary = useDeviceLibrary();
  const deviceLocalizations = useDeviceLocalizations();

  if (!resource) {
    return undefined;
  }

  if (resource.library) {
    const libraryVersion = libraries?.[resource.library];
    if (!libraryVersion) {
      return undefined;
    }

    return lookupResourceClass(
      database,
      resource.library,
      libraryVersion,
      resource.class,
    );
  } else {
    return lookupDeviceResourceClass(
      deviceLibrary,
      deviceLocalizations,
      resource.class,
    );
  }
}

export function useResourceAssetId(resource?: Resource): string | undefined {
  return useCurrentEditorPart((state) => {
    if (resource && resource.default) {
      return state.resources.resourceAssets[resource.default];
    }
    return undefined;
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function createNewResource(
  library: string,
  cls: string,
  id: string,
  _friendlyName: string,
) {
  updateCurrentEditor((editor) => {
    const resourceState = editor.resources;

    if (id in resourceState.resources) {
      return;
    }

    resourceState.resources[id] = {
      library,
      class: cls,
      access: [Access.Read, Access.Write],
      lifetime: Lifetime.Runtime,
    };

    resourceState.itemEditorLayout.push({
      id: nanoid(),
      udrId: id,
    });
  });
}

export function modifyResource(
  id: string,
  recipe: (state: Draft<Resource>) => void,
) {
  updateCurrentEditor((editor) => {
    const resource = editor.resources.resources[id];
    if (!resource) {
      return;
    }

    recipe(resource);
  });
}

export function changeResourceId(id: string, newId: string) {
  updateCurrentEditor((editor) => {
    const resState = editor.resources;
    if (newId in resState.resources) {
      return;
    }

    const existingParam = resState.resources[id];
    if (!existingParam) {
      return;
    }

    // Update UDR
    resState.resources[newId] = existingParam;
    delete resState.resources[id];

    // Update UI resState
    resState.itemEditorLayout.forEach((editor) => {
      if (editor.udrId === id) {
        editor.udrId = newId;
      }
    });
  });
}

export function deleteResource(id: string) {
  updateCurrentEditor((editor) => {
    const resourceState = editor.resources;
    delete resourceState.resources[id];
    resourceState.itemEditorLayout = resourceState.itemEditorLayout.filter(
      (value) => value.udrId !== id,
    );
  });
}

export async function updateResourceAsset(
  resourceId: string,
  oldAssetId?: string,
  newAssetId?: string,
) {
  if (oldAssetId) {
    await assetStorage.deleteAsset(oldAssetId);
  }

  updateCurrentEditor((editor) => {
    const resource = editor.resources.resources[resourceId];
    if (!resource) {
      return;
    }

    if (resource.default) {
      delete editor.resources.resourceAssets[resource.default];
    }

    if (newAssetId) {
      const fileName = getFileName(newAssetId, resource.mediaType);
      resource.default = fileName;
      editor.resources.resourceAssets[fileName] = newAssetId;
    } else {
      resource.default = undefined;
    }
  });
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function getFileName(assetId: string, mediaType?: string): string {
  const extension = getFileExtension(mediaType);
  if (extension) {
    return `${assetId}.${extension}`;
  } else {
    return assetId;
  }
}

function getFileExtension(mediaType?: string): string | null {
  switch (mediaType) {
    case "image/png":
      return "png";
    case "image/jpeg":
      return "jpg";
    case "image/svg":
      return "svg";
    case "text/plain":
      return "txt";
    case "application/json":
      return "json";
    case "application/octet-stream":
      return "bin";
    case "audio/mp3":
      return "mp3";
    case "video/mp4":
      return "mp4";
    default:
      return null;
  }
}

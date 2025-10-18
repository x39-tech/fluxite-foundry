import { Draft } from "immer";
import { useCurrentLocale, useUdrDatabase } from "app/store";
import { assetStorage } from "app/assetStorage";
import { CodexId, EntityId, Resource, Unlocalized } from "app/persistentState";
import { ItemEditor } from "utils/utils";
import { newEntityId } from "app/stateUtils";
import {
  updateCurrentEditor,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
} from "../state";
import {
  lookupDeviceResourceClass,
  lookupResourceClass,
  ResolvedResourceClass,
} from "../stateTransformations";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useResourceCodexIds(): string[] {
  const ids = useCurrentEditorPartShallow((state) =>
    Object.values(state.resources).map((res) => res.codexId),
  );
  return ids ?? [];
}

export function useResourceEditors(): ItemEditor[] {
  const editorIds =
    useCurrentEditorPartShallow((state) => state.resourceEditors) || [];
  const codexIds =
    useCurrentEditorPartShallow((state) =>
      editorIds.map((id) =>
        state.resources[id] ? state.resources[id].codexId : null,
      ),
    ) || [];

  return editorIds.reduce<ItemEditor[]>((acc, id, index) => {
    if (codexIds[index]) {
      acc.push({
        id,
        codexId: codexIds[index],
      });
    }
    return acc;
  }, []);
}

export function useResourceInfo(
  id: EntityId,
): { resource: Resource; resourceClass?: ResolvedResourceClass } | undefined {
  const editorPart = useCurrentEditorPartShallow((editor) => {
    return [
      editor.resources[id],
      editor.libraries,
      editor.resourceClasses,
      editor.localizations,
    ] as const;
  });
  if (!editorPart) return undefined;

  const [resource, libraries, deviceResourceClasses, localizations] =
    editorPart;
  const database = useUdrDatabase();
  const locale = useCurrentLocale();

  let resourceClass = undefined;
  if (resource.class.type === "imported") {
    const libraryVersion = libraries?.[resource.class.library];
    if (!libraryVersion) {
      return undefined;
    }

    resourceClass = lookupResourceClass(
      database,
      resource.class.codexId,
      resource.class.library,
      libraryVersion,
      locale,
    );
  } else {
    resourceClass = lookupDeviceResourceClass(
      deviceResourceClasses,
      localizations,
      resource.class.id,
      locale,
    );
  }

  return {
    resource,
    resourceClass,
  };
}

export function useResourceAssetId(resource?: Resource): string | undefined {
  return useCurrentEditorPart((state) => {
    if (resource && resource.default) {
      return state.resourceAssets[resource.default];
    }
    return undefined;
  });
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function createNewResource(
  library: string,
  resourceClass: CodexId,
  codexId: CodexId,
  _friendlyName: string,
) {
  updateCurrentEditor((editor) => {
    if (
      Object.values(editor.resources).some((res) => res.codexId === codexId)
    ) {
      return;
    }

    const resId = newEntityId();

    editor.resources[resId] = {
      codexId,
      // TODO handle device resource classes
      class: {
        type: "imported",
        codexId: resourceClass,
        library,
      },
      access: ["read", "write"],
      lifetime: "runtime",
    };

    editor.resourceEditors.push(resId);
  });
}

export function modifyResource(
  id: EntityId,
  recipe: (state: Draft<Unlocalized<Resource>>) => void,
) {
  updateCurrentEditor((editor) => {
    const resource = editor.resources[id];
    if (!resource) {
      return;
    }

    recipe(resource);
  });
}

export function deleteResource(id: EntityId) {
  updateCurrentEditor((editor) => {
    // TODO remove asset IDs
    delete editor.resources[id];
    editor.resourceEditors = editor.resourceEditors.filter(
      (value) => value !== id,
    );
  });
}

export async function updateResourceAsset(
  resourceId: EntityId,
  oldAssetId?: string,
  newAssetId?: string,
) {
  if (oldAssetId) {
    await assetStorage.deleteAsset(oldAssetId);
  }

  updateCurrentEditor((editor) => {
    const resource = editor.resources[resourceId];
    if (!resource) {
      return;
    }

    if (resource.default) {
      delete editor.resourceAssets[resource.default];
    }

    if (newAssetId) {
      const fileName = getFileName(newAssetId, resource.mediaType);
      resource.default = fileName;
      editor.resourceAssets[fileName] = newAssetId;
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

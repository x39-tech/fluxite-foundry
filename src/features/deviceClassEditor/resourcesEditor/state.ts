import { Draft } from "immer";
import { useCurrentLocale, useLibraryStore } from "app/store";
import {
  ClassReference,
  CodexId,
  EntityId,
  Resource,
} from "app/persistentState";
import { Unlocalized } from "features/localizations/types";
import { ItemEditor } from "utils/utils";
import { getWithId, newEntityId } from "app/stateUtils";
import {
  updateCurrentEditor,
  useCurrentEditorPart,
  useCurrentEditorPartShallow,
  useDeviceLibrary,
  useLibraries,
  useSourceLocale,
} from "../state";
import {
  lookupResourceClass,
  ResolvedResourceClass,
} from "../stateTransformations";
import { resolveClassRef } from "../classResolution";

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
  const deviceLibrary = useDeviceLibrary();
  const importedLibs = useLibraries();
  const resource = useCurrentEditorPart((editor) => editor.resources[id]);
  const libraryStore = useLibraryStore();
  const locale = useCurrentLocale();
  const sourceLocale = useSourceLocale();

  if (!deviceLibrary || !importedLibs || !resource) return undefined;

  const resolved = resolveClassRef(
    resource.class,
    importedLibs,
    deviceLibrary,
    libraryStore,
    "resourceClasses",
  );
  const resourceClass = resolved
    ? lookupResourceClass(resolved, locale, sourceLocale)
    : undefined;

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
  library: string | undefined,
  resourceClass: CodexId,
  codexId: CodexId,
  _friendlyName: string,
) {
  updateCurrentEditor("Add Resource", (editor) => {
    if (
      Object.values(editor.resources).some((res) => res.codexId === codexId)
    ) {
      return;
    }

    let classRef: ClassReference;
    if (library === undefined) {
      const rc = getWithId(
        editor.resourceClasses,
        (cls) => cls.codexId === resourceClass,
      );
      if (!rc) {
        return;
      }
      classRef = { type: "local", id: rc.id };
    } else {
      classRef = { type: "imported", codexId: resourceClass, library };
    }

    const resId = newEntityId();

    editor.resources[resId] = {
      codexId,
      class: classRef,
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
  updateCurrentEditor("Edit Resource", (editor) => {
    const resource = editor.resources[id];
    if (!resource) {
      return;
    }

    recipe(resource);
  });
}

export function deleteResource(id: EntityId) {
  updateCurrentEditor("Delete Resource", (editor) => {
    const resource = editor.resources[id];
    if (resource?.default) {
      delete editor.resourceAssets[resource.default];
    }

    delete editor.resources[id];
    editor.resourceEditors = editor.resourceEditors.filter(
      (value) => value !== id,
    );
  });
}

/**
 * Points a resource at a different asset, or at none.
 *
 * The old asset is not cleaned up here, that is the job of
 * app/assetLifecycle.ts.
 */
export function updateResourceAsset(resourceId: EntityId, newAssetId?: string) {
  updateCurrentEditor("Change Resource File", (editor) => {
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

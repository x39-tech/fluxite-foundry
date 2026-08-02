import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { closeDocument, setSelectedDocument } from "features/topNavBar/state";
import { deviceClassAssets } from "features/deviceClassEditor/assets";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import {
  deleteResource,
  updateResourceAsset,
} from "features/deviceClassEditor/resourcesEditor/state";
import { CodexId, EntityId } from "./persistentState";
import { updateAppPersistentState, useAppPersistentStore } from "./store";
import { assetStorage } from "./assetStorage";
import { initUndo, MAX_HISTORY_ENTRIES, undo } from "./undo";
import {
  assetIdsOfDocument,
  cleanupUnreferencedAssets,
  initAssetLifecycle,
  cleanupAssets,
} from "./assetLifecycle";

const FIRST_EDITOR = EntityId("test-editor-id");
const SECOND_EDITOR = EntityId("second-editor-id");
const RESOURCE = EntityId("resource-id");

// Exercised through the device class editor, which is the only document type
// that refers to assets so far.
describe("asset lifecycle", () => {
  let stopLifecycle: () => void = () => {};
  let stopUndo: () => void = () => {};

  beforeEach(async () => {
    await assetStorage.restore({ meta: [], data: [] });
    resetAllStores();
    createEmptyDeviceClassEditor();
    addResource();

    // Started on an empty database, so the cleanup this sets off has nothing to
    // find and cannot race the assets a test goes on to store.
    stopLifecycle = initAssetLifecycle([deviceClassAssets]);
    stopUndo = initUndo({
      documentAssetIds: assetIdsOfDocument,
      onAssetsReleased: cleanupAssets,
    });
  });

  afterEach(() => {
    stopUndo();
    stopLifecycle();
  });

  test("keeps an asset an open document refers to", async () => {
    const asset = await storeAsset("original");
    updateResourceAsset(RESOURCE, asset);

    expect(await cleanupUnreferencedAssets()).toEqual([]);
    expect(await contentOf(asset)).toBe("original");
  });

  test("cleans up an asset no document refers to", async () => {
    const asset = await storeAsset("orphan");

    expect(await cleanupUnreferencedAssets()).toEqual([asset]);
    expect(await assetStorage.getAsset(asset)).toBeUndefined();
  });

  test("cleans up what an earlier session left behind, at startup", async () => {
    const leftBehind = await storeAsset("left behind by a session that quit");
    stopLifecycle();

    stopLifecycle = initAssetLifecycle([deviceClassAssets]);

    await cleanupOf(leftBehind);
  });

  test("keeps the bytes of an asset a resource stops using", async () => {
    const original = await storeAsset("original");
    updateResourceAsset(RESOURCE, original);
    const replacement = await storeAsset("replacement");

    updateResourceAsset(RESOURCE, replacement);

    expect(assetOf(RESOURCE)).toBe(replacement);
    expect(await contentOf(original)).toBe("original");
  });

  test("restores the original asset when an edit is undone", async () => {
    const original = await storeAsset("original");
    updateResourceAsset(RESOURCE, original);
    const replacement = await storeAsset("replacement");

    updateResourceAsset(RESOURCE, replacement);
    undo(FIRST_EDITOR);

    expect(assetOf(RESOURCE)).toBe(original);
    expect(await contentOf(original)).toBe("original");
  });

  test("keeps an asset only a document's history can still reach", async () => {
    const dropped = await storeAsset("dropped, but an undo away");
    updateResourceAsset(RESOURCE, dropped);
    updateResourceAsset(RESOURCE);

    expect(await cleanupUnreferencedAssets()).toEqual([]);
    expect(await contentOf(dropped)).toBe("dropped, but an undo away");
  });

  test("cleans up an asset once the history holding it has gone", async () => {
    const dropped = await storeAsset("dropped, and the history with it");
    updateResourceAsset(RESOURCE, dropped);
    updateResourceAsset(RESOURCE);

    closeDocument(FIRST_EDITOR);

    await cleanupOf(dropped);
  });

  test("cleans up an asset an undo dropped when its document closes", async () => {
    const asset = await storeAsset("given to a resource, then undone");
    updateResourceAsset(RESOURCE, asset);

    // Undoing puts the change on the redo stack, which is then the only thing
    // that knows about the asset. The test above is the same story with the
    // asset left on the undo stack instead.
    undo(FIRST_EDITOR);
    closeDocument(FIRST_EDITOR);

    await cleanupOf(asset);
  });

  test("cleans up an asset that falls off the end of the history", async () => {
    const dropped = await storeAsset("dropped a long time ago");
    updateResourceAsset(RESOURCE, dropped);
    updateResourceAsset(RESOURCE);

    for (let i = 0; i < MAX_HISTORY_ENTRIES; i++) {
      updateCurrentEditor("Rename Device", (editor) => {
        editor.basicData.modelName = `Renamed ${i}`;
      });
    }

    await cleanupOf(dropped);
  });

  test("keeps the bytes of a deleted resource's asset", async () => {
    const asset = await storeAsset("deleted with its resource");
    updateResourceAsset(RESOURCE, asset);

    deleteResource(RESOURCE);

    expect(await contentOf(asset)).toBe("deleted with its resource");
  });

  test("cleans up the assets of a document that closes", async () => {
    const asset = await storeAsset("only in the closed document");
    updateResourceAsset(RESOURCE, asset);

    closeDocument(FIRST_EDITOR);

    await vi.waitFor(async () => {
      expect(await assetStorage.getAsset(asset)).toBeUndefined();
    });
  });

  test("keeps an asset another open document still refers to", async () => {
    const shared = await storeAsset("shared");
    updateResourceAsset(RESOURCE, shared);
    openSecondEditor();

    // The document about to close keeps an asset of its own, as the signal
    // that its cleanup has run.
    setSelectedDocument(FIRST_EDITOR);
    const ownAsset = await storeAsset("only in the closed document");
    updateResourceAsset(RESOURCE, ownAsset);

    closeDocument(FIRST_EDITOR);

    await cleanupOf(ownAsset);
    expect(await contentOf(shared)).toBe("shared");
  });

  test("leaves the assets of the documents still open alone", async () => {
    openSecondEditor();
    setSelectedDocument(FIRST_EDITOR);
    const closing = await storeAsset("in the document that closes");
    updateResourceAsset(RESOURCE, closing);

    // An asset the other document has dropped but could still get back by
    // undoing the edit that dropped it.
    setSelectedDocument(SECOND_EDITOR);
    const dropped = await storeAsset("dropped by the document staying open");
    updateResourceAsset(RESOURCE, dropped);
    updateResourceAsset(RESOURCE);

    closeDocument(FIRST_EDITOR);

    await cleanupOf(closing);
    expect(await contentOf(dropped)).toBe(
      "dropped by the document staying open",
    );
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function storeAsset(content: string): Promise<string> {
  const data = new TextEncoder().encode(content).buffer;
  return assetStorage.storeAsset(data, "text/plain", "test.txt");
}

async function contentOf(assetId: string): Promise<string | undefined> {
  const asset = await assetStorage.getAsset(assetId);
  return asset && new TextDecoder().decode(asset.data);
}

// Waits for a cleanup to have run, using an asset that is known to be
// eligible for cleanup as the signal that it has.
async function cleanupOf(assetId: string): Promise<void> {
  await vi.waitFor(async () => {
    expect(await assetStorage.getAsset(assetId)).toBeUndefined();
  });
}

// The asset the resource currently uses as its default value.
function assetOf(resourceId: EntityId): string | undefined {
  const editor = useAppPersistentStore.getState().documents[FIRST_EDITOR];
  const fileName = editor.resources[resourceId]?.default;
  return fileName ? editor.resourceAssets[fileName] : undefined;
}

function addResource() {
  updateCurrentEditor("Test Change", (editor) => {
    editor.resources[RESOURCE] = {
      codexId: CodexId("resource"),
      class: {
        type: "imported",
        codexId: CodexId("resourceClass"),
        library: "test-library",
      },
      access: ["read"],
      lifetime: "runtime",
      mediaType: "text/plain",
    };
    editor.resourceEditors.push(RESOURCE);
  });
}

// Opens a second device class document, as a copy of the first, and selects it.
function openSecondEditor() {
  const source = useAppPersistentStore.getState().documents[FIRST_EDITOR];

  updateAppPersistentState((state) => {
    state.documents[SECOND_EDITOR] = {
      ...source,
      deviceClassId: "second-device-class",
    };
    state.session.openDocuments.push(SECOND_EDITOR);
    state.session.layouts[SECOND_EDITOR] = state.session.layouts[FIRST_EDITOR];
    state.session.selectedDocumentId = SECOND_EDITOR;
  });
}

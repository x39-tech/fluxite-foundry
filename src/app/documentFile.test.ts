import JSZip from "jszip";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { deviceClassAssets } from "features/deviceClassEditor/assets";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import { updateResourceAsset } from "features/deviceClassEditor/resourcesEditor/state";
import { assetStorage } from "./assetStorage";
import { assetIdsOfDocument, initAssetLifecycle } from "./assetLifecycle";
import {
  DOCUMENT_FILE_FORMAT_VERSION,
  documentFileName,
  getDocumentFile,
  initDocumentFiles,
  openDocument,
  readDocumentFile,
  saveDocument,
  writeDocumentFile,
} from "./documentFile";
import {
  DOCUMENT_ENVELOPES,
  ENVELOPED_DOCUMENT_ID,
} from "./documentFileEnvelopes";
import { CodexId, EntityId, VERSION as STATE_VERSION } from "./persistentState";
import { useAppPersistentStore } from "./store";
import { closeDocument, setSelectedDocument } from "./documents";

const EDITOR = EntityId("test-editor-id");
const RESOURCE = EntityId("resource-id");

const save = vi.fn();
const writeFile = vi.fn();

vi.mock("@tauri-apps/api/core", () => ({ isTauri: () => false }));
vi.mock("@tauri-apps/plugin-dialog", () => ({
  save: (...args: unknown[]) => save(...args) as unknown,
}));
vi.mock("@tauri-apps/plugin-fs", () => ({
  writeFile: (...args: unknown[]) => writeFile(...args) as unknown,
}));

describe("save files", () => {
  let stopLifecycle: () => void = () => {};
  let stopTracking: () => void = () => {};

  beforeEach(async () => {
    vi.clearAllMocks();
    await assetStorage.restore({ meta: [], data: [] });
    resetAllStores();
    createEmptyDeviceClassEditor();

    stopLifecycle = initAssetLifecycle([deviceClassAssets]);
    stopTracking = initDocumentFiles();
  });

  afterEach(() => {
    stopTracking();
    stopLifecycle();
  });

  describe("writing and reading", () => {
    test("a written document reads back as the document that was written", async () => {
      const written = await readBack();

      expect(written.document).toEqual(currentDocument());
      expect(written.stateVersion).toBe(STATE_VERSION);
    });

    test("carries the bytes of the assets the document refers to", async () => {
      addResource();
      const assetId = await storeAsset("the asset bytes");
      updateResourceAsset(RESOURCE, assetId);

      const written = await readBack();

      expect(written.assets).toHaveLength(1);
      expect(written.assets[0].id).toBe(assetId);
      expect(decode(written.assets[0].data)).toBe("the asset bytes");
    });

    test("leaves out assets no document in the file refers to", async () => {
      await storeAsset("nothing points at this");

      const written = await readBack();

      expect(written.assets).toEqual([]);
    });

    test("reports an asset whose bytes have gone missing", async () => {
      addResource();
      const assetId = await storeAsset("about to disappear");
      updateResourceAsset(RESOURCE, assetId);
      await assetStorage.deleteAsset(assetId);

      const { missingAssetIds } = await writeDocumentFile(
        useAppPersistentStore.getState(),
        EDITOR,
      );

      expect(missingAssetIds).toEqual([assetId]);
    });

    test("names the file after the document", () => {
      expect(documentFileName(currentDocument())).toBe("Test Model.ffd");
    });

    test("keeps a document name that is not a usable file name out of the file name", () => {
      updateCurrentEditor("Rename", (editor) => {
        editor.basicData.modelName = "Model 5/8 : rev?2";
      });

      expect(documentFileName(currentDocument())).toBe("Model 5-8 - rev-2.ffd");
    });
  });

  describe("refusing a file it cannot open", () => {
    test("refuses something that is not a zip at all", async () => {
      await expect(readDocumentFile(new Blob(["not a zip"]))).rejects.toThrow(
        /not a Fluxite Foundry document/,
      );
    });

    test("refuses a zip with no manifest in it", async () => {
      const zip = new JSZip();
      zip.file("something-else.json", "{}");

      await expect(
        readDocumentFile(await zip.generateAsync({ type: "blob" })),
      ).rejects.toThrow(/no document.json/);
    });

    test("refuses a save file format newer than this build", async () => {
      await expect(
        readDocumentFile(
          await fileWith({ formatVersion: DOCUMENT_FILE_FORMAT_VERSION + 1 }),
        ),
      ).rejects.toThrow(/newer than this build understands/);
    });

    test("refuses a state version newer than this build", async () => {
      await expect(
        readDocumentFile(await fileWith({ stateVersion: STATE_VERSION + 1 })),
      ).rejects.toThrow(/newer than this build understands/);
    });

    test("refuses a document type this build has never heard of", async () => {
      await expect(
        readDocumentFile(await fileWith({ documentType: "starship" })),
      ).rejects.toThrow(/does not know how to open a document of type/);
    });

    test("refuses a state version it cannot build an envelope for", async () => {
      await expect(
        readDocumentFile(await fileWith({ stateVersion: 1 })),
      ).rejects.toThrow(/cannot read a document written at state version 1/);
    });

    test("refuses a document that does not match the version it claims", async () => {
      await expect(
        readDocumentFile(await fileWith({ document: { type: "deviceClass" } })),
      ).rejects.toThrow(/does not match state version/);
    });
  });

  describe("migrating an older document", () => {
    // Save files began at v5, so there is no older one in the wild. The
    // envelope for an out-of-date version is registered here instead, which
    // exercises the same path a real one will take: wrap, run the chain, take
    // the document back out.
    beforeEach(() => {
      // Written out rather than loaded from a file, because v4 predates
      // `documents` and so cannot be enveloped the way the real ones are.
      DOCUMENT_ENVELOPES[4] = (document) => ({
        appSettings: {
          theme: "system",
          orgId: { type: "org", id: "com.example" },
          locale: "en-GB",
        },
        openEditors: {
          editors: [{ type: "deviceClass", id: ENVELOPED_DOCUMENT_ID }],
          selectedEditor: 0,
        },
        deviceClassEditors: { [ENVELOPED_DOCUMENT_ID]: document },
      });
    });

    afterEach(() => {
      delete DOCUMENT_ENVELOPES[4];
    });

    test("brings a document up to the current state version", async () => {
      const file = await fileWith({
        stateVersion: 4,
        document: v4Document(),
      });

      const loaded = await readDocumentFile(file);

      expect(loaded.stateVersion).toBe(4);
      // Stamped on by the v4 to v5 migration.
      expect(loaded.document.type).toBe("deviceClass");
      // Seeded by that migration from the envelope's locale setting.
      expect(loaded.document.sourceLocale).toBe("en-GB");
      expect(
        (loaded.document as { windowLayout?: string }).windowLayout,
      ).toBeUndefined();
    });
  });

  describe("opening", () => {
    test("opens as another document alongside the one already open", async () => {
      const file = await savedFile();

      const openedId = await openDocument({ data: file, name: "saved.ffd" });

      const state = useAppPersistentStore.getState();
      expect(openedId).not.toBe(EDITOR);
      expect(state.session.openDocuments).toEqual([EDITOR, openedId]);
      expect(state.session.selectedDocumentId).toBe(openedId);
      expect(state.documents[openedId]).toEqual(state.documents[EDITOR]);
    });

    test("stores the file's assets again under ids of their own", async () => {
      addResource();
      const assetId = await storeAsset("shared bytes");
      updateResourceAsset(RESOURCE, assetId);

      const openedId = await openDocument({
        data: await savedFile(),
        name: "saved.ffd",
      });

      const state = useAppPersistentStore.getState();
      const openedAssetId = assetIdsOfDocument(state, openedId)[0];
      expect(openedAssetId).toBeDefined();
      expect(openedAssetId).not.toBe(assetId);
      // Both documents can still reach their own bytes.
      expect(await contentOf(assetId)).toBe("shared bytes");
      expect(await contentOf(openedAssetId)).toBe("shared bytes");
    });

    test("remembers the file it came from, and calls it clean", async () => {
      const openedId = await openDocument({
        data: await savedFile(),
        name: "saved.ffd",
        path: "/Users/someone/saved.ffd",
      });

      expect(getDocumentFile(openedId)).toEqual({
        fileName: "saved.ffd",
        path: "/Users/someone/saved.ffd",
        dirty: false,
      });
    });
  });

  describe("keeping track of what is out of date", () => {
    test("a document that has never been written has no file", () => {
      expect(getDocumentFile(EDITOR)).toBeUndefined();
    });

    test("saving records the file and leaves the document clean", async () => {
      await saveDocument(EDITOR);

      expect(getDocumentFile(EDITOR)).toEqual({
        fileName: "Test Model.ffd",
        // The browser does not say where a download went.
        path: undefined,
        dirty: false,
      });
    });

    test("a change after saving makes the document dirty", async () => {
      await saveDocument(EDITOR);

      updateCurrentEditor("Rename", (editor) => {
        editor.basicData.modelName = "A Different Model";
      });

      expect(getDocumentFile(EDITOR)?.dirty).toBe(true);
    });

    test("a change to another document leaves this one clean", async () => {
      const openedId = await openDocument({
        data: await savedFile(),
        name: "saved.ffd",
      });
      await saveDocument(EDITOR);

      // Opening a document selects it, so the change below has to be aimed
      // back at the one it is about.
      setSelectedDocument(EDITOR);
      updateCurrentEditor("Rename", (editor) => {
        editor.basicData.modelName = "A Different Model";
      });

      expect(getDocumentFile(openedId)?.dirty).toBe(false);
      expect(getDocumentFile(EDITOR)?.dirty).toBe(true);
    });

    test("a change to the app's settings makes no document dirty", async () => {
      await saveDocument(EDITOR);

      useAppPersistentStore.setState((state) => ({
        appSettings: { ...state.appSettings, theme: "dark" as const },
      }));

      expect(getDocumentFile(EDITOR)?.dirty).toBe(false);
    });

    test("saving again makes the document clean", async () => {
      await saveDocument(EDITOR);
      updateCurrentEditor("Rename", (editor) => {
        editor.basicData.modelName = "A Different Model";
      });

      await saveDocument(EDITOR);

      expect(getDocumentFile(EDITOR)?.dirty).toBe(false);
    });

    test("a closed document's file is forgotten", async () => {
      await saveDocument(EDITOR);

      closeDocument(EDITOR);

      expect(getDocumentFile(EDITOR)).toBeUndefined();
    });
  });
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function currentDocument() {
  return useAppPersistentStore.getState().documents[EDITOR];
}

async function savedFile(): Promise<Blob> {
  const { blob } = await writeDocumentFile(
    useAppPersistentStore.getState(),
    EDITOR,
  );
  return blob;
}

async function readBack() {
  return readDocumentFile(await savedFile());
}

/** A save file whose manifest has been tampered with. */
async function fileWith(overrides: Record<string, unknown>): Promise<Blob> {
  const original = await JSZip.loadAsync(await savedFile());
  const manifest = JSON.parse(
    await original.file("document.json")!.async("string"),
  ) as Record<string, unknown>;

  const zip = new JSZip();
  zip.file("document.json", JSON.stringify({ ...manifest, ...overrides }));
  return zip.generateAsync({ type: "blob" });
}

/** The current document as it would have looked at state version 4. */
function v4Document(): Record<string, unknown> {
  const {
    type: _type,
    sourceLocale: _sourceLocale,
    localizations,
    ...rest
  } = currentDocument() as Record<string, unknown> & {
    type: string;
    sourceLocale: string;
    localizations: Record<string, { strings: Record<string, string> }>;
  };

  return {
    ...rest,
    // v4 kept the back-references from a string to the things using it in the
    // string itself. v5 derives them instead.
    localizations: Object.fromEntries(
      Object.entries(localizations).map(([key, localization]) => [
        key,
        { ...localization, items: [] },
      ]),
    ),
    windowLayout: "{}",
  };
}

function addResource() {
  updateCurrentEditor("Add Resource", (editor) => {
    editor.resources[RESOURCE] = {
      codexId: CodexId("test-resource"),
      class: { type: "local", id: EntityId("resource-class-id") },
      access: ["read"],
      lifetime: "static",
      default: "default-value",
    };
    editor.resourceEditors.push(RESOURCE);
  });
}

async function storeAsset(contents: string): Promise<string> {
  return assetStorage.storeAsset(
    new TextEncoder().encode(contents).buffer as ArrayBuffer,
    "text/plain",
  );
}

async function contentOf(assetId: string): Promise<string | undefined> {
  const asset = await assetStorage.getAsset(assetId);
  return asset && decode(asset.data);
}

function decode(data: ArrayBuffer): string {
  return new TextDecoder().decode(data);
}

// Save files.
//
// A save file holds one document (e.g. a device class, library or system). It
// is a zip containing document.json, which carries the document and the state
// version it was written at, and the bytes of every asset the document refers
// to.
//
// Save files are migrated on open through the same mechanism as the overall app
// state.

import JSZip from "jszip";
import * as z from "zod";
import { toast } from "sonner";
import { APP_NAME, APP_VERSION, BUILD_STRING } from "consts";
import { errorMessage, getDefaultWindowLayout } from "utils/utils";
import { assetStorage } from "./assetStorage";
import { assetIdsOfDocument, remapDocumentAssetIds } from "./assetLifecycle";
import { documentName, patchesByDocument } from "./documents";
import { fileNameFromPath, openFile, OpenedFile } from "./openFile";
import { saveFile, writeFileToPath } from "./saveFile";
import { newEntityId } from "./stateUtils";
import {
  AppPersistentState,
  Document,
  documentTypes,
  EntityId,
  VERSION as STATE_VERSION,
} from "./persistentState";
import { getMigration, getSchemaForVersion } from "./persistentStateMigrations";
import {
  envelopeForVersion,
  ENVELOPED_DOCUMENT_ID,
} from "./documentFileEnvelopes";
import { DocumentFile } from "./runtimeState";
import {
  StateChange,
  subscribeToStatePatches,
  updateAppPersistentState,
  updateAppRuntimeState,
  useAppPersistentStore,
  useAppRuntimeStore,
} from "./store";

/** Version of the save file format itself, not of the state inside it. */
export const DOCUMENT_FILE_FORMAT_VERSION = 1;

export const DOCUMENT_FILE_EXTENSION = "ffd";
export const DOCUMENT_FILE_TYPE_NAME = `${APP_NAME} Document`;

const MANIFEST_FILE_NAME = "document.json";
const ASSET_DIRECTORY = "assets";

// ---------------------------------------------------------------------------
// The file format
// ---------------------------------------------------------------------------

const DocumentFileAssetSchema = z.object({
  id: z.string(),
  /** Where the bytes are within the zip. */
  path: z.string(),
  mediaType: z.string().optional(),
  originalFileName: z.string().optional(),
});

const DocumentFileSchema = z.object({
  formatVersion: z.number().int().positive(),
  stateVersion: z.number().int().positive(),
  documentType: z.string(),
  savedAt: z.string().optional(),
  appVersion: z.string().optional(),
  buildString: z.string().optional(),
  document: z.record(z.string(), z.unknown()),
  assets: z.array(DocumentFileAssetSchema),
});

/** A save file that has been read, and whose document is at {@link STATE_VERSION}. */
export interface LoadedDocument {
  document: Document;
  /** The state version the file was written at, before migration. */
  stateVersion: number;
  savedAt?: string;
  appVersion?: string;
  assets: LoadedAsset[];
}

/** An asset associated with a document that has been read. */
export interface LoadedAsset {
  /** The id the document refers to the asset by, as the file was written. */
  id: string;
  data: ArrayBuffer;
  mediaType?: string;
  originalFileName?: string;
}

export interface WrittenDocument {
  blob: Blob;
  /**
   * Assets that are missing in the loaded document state and thus cannot be
   * written to the save file.
   */
  missingAssetIds: string[];
}

/**
 * Package one document, and the assets it refers to, as a save file.
 *
 * @throws if the state holds no such document.
 */
export async function writeDocumentFile(
  state: AppPersistentState,
  documentId: EntityId,
): Promise<WrittenDocument> {
  const document = state.documents[documentId];
  if (!document) {
    throw new Error("The document is no longer open.");
  }

  const zip = new JSZip();
  const assets: z.infer<typeof DocumentFileAssetSchema>[] = [];
  const missingAssetIds: string[] = [];

  for (const assetId of new Set(assetIdsOfDocument(state, documentId))) {
    const asset = await assetStorage.getAsset(assetId);
    if (!asset) {
      missingAssetIds.push(assetId);
      continue;
    }

    const path = `${ASSET_DIRECTORY}/${assetId}`;
    zip.file(path, asset.data);
    assets.push({
      id: assetId,
      path,
      mediaType: asset.mediaType,
      originalFileName: asset.originalFileName,
    });
  }

  zip.file(
    MANIFEST_FILE_NAME,
    JSON.stringify({
      formatVersion: DOCUMENT_FILE_FORMAT_VERSION,
      stateVersion: STATE_VERSION,
      documentType: document.type,
      savedAt: new Date().toISOString(),
      appVersion: APP_VERSION,
      buildString: BUILD_STRING,
      document,
      assets,
    }),
  );

  return {
    blob: await zip.generateAsync({ type: "blob", compression: "DEFLATE" }),
    missingAssetIds,
  };
}

/**
 * Read a save file, migrating its document to the current state version.
 *
 * @throws if the file is not a usable save file, with a message suitable for
 * showing to the user.
 */
export async function readDocumentFile(data: Blob): Promise<LoadedDocument> {
  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(data);
  } catch {
    throw new Error(`The selected file is not a ${APP_NAME} document.`);
  }

  const manifestFile = zip.file(MANIFEST_FILE_NAME);
  if (!manifestFile) {
    throw new Error(
      `The selected file is not a ${APP_NAME} document: it has no ${MANIFEST_FILE_NAME}.`,
    );
  }

  const manifest = parseManifest(await manifestFile.async("string"));

  if (manifest.formatVersion > DOCUMENT_FILE_FORMAT_VERSION) {
    throw new Error(
      `This document was written in save file format v${manifest.formatVersion}, ` +
        `which is newer than this build understands (v${DOCUMENT_FILE_FORMAT_VERSION}). ` +
        `Update ${APP_NAME} to open it.`,
    );
  }

  if (!isKnownDocumentType(manifest.documentType)) {
    throw new Error(
      `This build does not know how to open a document of type "${manifest.documentType}". ` +
        `Update ${APP_NAME} to open it.`,
    );
  }

  const document = migrateDocument(manifest.document, manifest.stateVersion);

  const assets: LoadedAsset[] = [];
  for (const asset of manifest.assets) {
    const file = zip.file(asset.path);
    if (!file) {
      // Skip assets with missing data
      continue;
    }

    assets.push({
      id: asset.id,
      data: await file.async("arraybuffer"),
      mediaType: asset.mediaType,
      originalFileName: asset.originalFileName,
    });
  }

  return {
    document,
    stateVersion: manifest.stateVersion,
    savedAt: manifest.savedAt,
    appVersion: manifest.appVersion,
    assets,
  };
}

/**
 * The name a document is offered to be saved under.
 */
export function documentFileName(document: Document): string {
  // Replace characters that are awkward or not allowed in file names with a
  // placeholder.
  const stem =
    documentName(document)
      .replace(/[\\/:*?"<>|]/g, "-")
      .trim() || "document";

  return `${stem}.${DOCUMENT_FILE_EXTENSION}`;
}

// ---------------------------------------------------------------------------
// Opening and saving
// ---------------------------------------------------------------------------

export type SaveOutcome = "saved" | "cancelled";

/**
 * Ask for a save file and open it as another editor.
 *
 * @returns the id the opened document was given, or undefined if the user
 * changed their mind.
 * @throws if the file cannot be opened, with a message suitable for showing to
 * the user.
 */
export async function openDocumentFile(): Promise<EntityId | undefined> {
  const file = await openFile(
    [DOCUMENT_FILE_EXTENSION],
    DOCUMENT_FILE_TYPE_NAME,
  );
  if (file === "cancelled") {
    return undefined;
  }

  return openDocument(file);
}

/**
 * Open a save file that has already been read from wherever it lives.
 *
 * Each document gets its own unique ID and unique asset IDs, even if it is
 * loaded from the same file.
 */
export async function openDocument(file: OpenedFile): Promise<EntityId> {
  const loaded = await readDocumentFile(file.data);

  const newAssetIds = new Map<string, string>();
  for (const asset of loaded.assets) {
    newAssetIds.set(
      asset.id,
      await assetStorage.storeAsset(
        asset.data,
        asset.mediaType,
        asset.originalFileName,
      ),
    );
  }

  const document = remapDocumentAssetIds(loaded.document, (assetId) =>
    newAssetIds.get(assetId),
  );

  const documentId = newEntityId();
  updateAppPersistentState((state) => {
    state.documents[documentId] = document;
    state.session.openDocuments.push(documentId);
    state.session.layouts[documentId] = JSON.stringify(
      getDefaultWindowLayout(),
    );
    state.session.selectedDocumentId = documentId;
  });

  setDocumentFile(documentId, {
    fileName: file.name,
    path: file.path,
    dirty: false,
  });

  return documentId;
}

/**
 * Write a document back to the file it came from, asking for a place to put it
 * if it has no file yet or the platform cannot write to one.
 *
 * @throws if the document cannot be written, with a message suitable for
 * showing to the user.
 */
export async function saveDocument(documentId: EntityId): Promise<SaveOutcome> {
  const file = getDocumentFile(documentId);
  return file?.path === undefined
    ? saveDocumentAs(documentId)
    : writeDocument(documentId, file.path, file.fileName);
}

/**
 * Ask where to put a document and write it there.
 *
 * @throws if the document cannot be written, with a message suitable for
 * showing to the user.
 */
export async function saveDocumentAs(
  documentId: EntityId,
): Promise<SaveOutcome> {
  return writeDocument(documentId);
}

/**
 * Whether a document has been written to a file since it was last changed. A
 * document that has never been written to one at all has no file to be out of
 * date, and is not dirty.
 */
export function useDocumentIsDirty(id: EntityId | undefined): boolean {
  return useAppRuntimeStore((state) =>
    id === undefined ? false : (state.documentFiles[id]?.dirty ?? false),
  );
}

export function getDocumentFile(id: EntityId): DocumentFile | undefined {
  return useAppRuntimeStore.getState().documentFiles[id];
}

/**
 * Starts keeping track of which documents have diverged from their files.
 *
 * Returns a function that stops it again. Calling this twice replaces the first
 * registration rather than adding a second.
 */
export function initDocumentFiles(): () => void {
  stopTrackingFiles();

  const unsubscribe = subscribeToStatePatches(onStateChanged);

  const stop = () => {
    unsubscribe();
    if (stopTracking === stop) {
      stopTracking = undefined;
    }
  };
  stopTracking = stop;

  return stop;
}

export function stopTrackingFiles() {
  stopTracking?.();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let stopTracking: (() => void) | undefined;

function parseManifest(text: string): z.infer<typeof DocumentFileSchema> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(
      `The selected file is not a ${APP_NAME} document: its ${MANIFEST_FILE_NAME} is not valid JSON.`,
    );
  }

  const result = DocumentFileSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `The selected file is not a ${APP_NAME} document: ${result.error.message}`,
    );
  }

  return result.data;
}

function isKnownDocumentType(type: string): boolean {
  return (Object.values(documentTypes) as string[]).includes(type);
}

/**
 * Bring a document written at some older state version up to the current one,
 * by running the state migration chain on the smallest valid state that can
 * hold it. See app/documentFileEnvelopes.ts.
 */
function migrateDocument(document: unknown, fromVersion: number): Document {
  if (fromVersion > STATE_VERSION) {
    throw new Error(
      `This document was written at state version ${fromVersion}, which is newer ` +
        `than this build understands (${STATE_VERSION}). Update ${APP_NAME} to open it.`,
    );
  }

  // The envelopes are the authority on which versions can be read: reading one
  // means being able to build a valid state of its version to migrate it in.
  const envelope = envelopeForVersion(fromVersion);
  if (!envelope) {
    throw new Error(
      `This build cannot read a document written at state version ${fromVersion}.`,
    );
  }

  let state: unknown = envelope(document);

  const fromSchema = getSchemaForVersion(fromVersion);
  if (fromSchema && !fromSchema.safeParse(state).success) {
    throw new Error(
      `This document does not match state version ${fromVersion}, which it says it was written at.`,
    );
  }

  for (let version = fromVersion; version < STATE_VERSION; version++) {
    const migration = getMigration(version);
    if (!migration) {
      throw new Error(
        `This document cannot be brought up to date: no migration from state version ${version}.`,
      );
    }

    try {
      state = migration.migrate(state);
    } catch (error) {
      throw new Error(
        `This document could not be brought up to date, from state version ` +
          `${version} to ${version + 1}: ${errorMessage(error)}`,
      );
    }
  }

  const currentSchema = getSchemaForVersion(STATE_VERSION);
  const result = currentSchema?.safeParse(state);
  if (!result?.success) {
    throw new Error(
      `This document could not be brought up to date: ${result?.error.message ?? "unknown error"}`,
    );
  }

  const migrated = (result.data as AppPersistentState).documents[
    ENVELOPED_DOCUMENT_ID
  ];
  if (!migrated) {
    throw new Error("This document was lost while being brought up to date.");
  }

  return migrated;
}

// Writes a document out, either to a path it already has or to one the user is
// asked for, and records where it went.
async function writeDocument(
  documentId: EntityId,
  path?: string,
  fileName?: string,
): Promise<SaveOutcome> {
  const state = useAppPersistentStore.getState();
  const document = state.documents[documentId];
  if (!document) {
    throw new Error("The document is no longer open.");
  }

  const { blob, missingAssetIds } = await writeDocumentFile(state, documentId);

  if (path !== undefined && fileName !== undefined) {
    await writeFileToPath(blob, path);
    setDocumentFile(documentId, { fileName, path, dirty: false });
    reportMissingAssets(missingAssetIds);
    return "saved";
  }

  const suggestedName =
    getDocumentFile(documentId)?.fileName ?? documentFileName(document);
  const result = await saveFile(blob, suggestedName, DOCUMENT_FILE_TYPE_NAME);
  if (result.status === "cancelled") {
    return "cancelled";
  }

  setDocumentFile(documentId, {
    // Save path on desktop for re-saving in the future
    fileName: result.path ? fileNameFromPath(result.path) : suggestedName,
    path: result.path,
    dirty: false,
  });
  reportMissingAssets(missingAssetIds);

  return "saved";
}

function reportMissingAssets(missingAssetIds: string[]) {
  if (missingAssetIds.length > 0) {
    const message = `Saved a document without ${missingAssetIds.length} asset(s) whose data could not be found`;
    toast.warning(message);
    console.warn(`${message}:`, missingAssetIds);
  }
}

function setDocumentFile(documentId: EntityId, file: DocumentFile) {
  updateAppRuntimeState((state) => {
    state.documentFiles[documentId] = file;
  });
}

function onStateChanged(change: StateChange) {
  markChangedDocumentsDirty(change);
  forgetClosedDocuments(change);
}

function markChangedDocumentsDirty(change: StateChange) {
  const files = useAppRuntimeStore.getState().documentFiles;
  const changed = [...patchesByDocument(change.patches).keys()].filter(
    (documentId) => files[documentId]?.dirty === false,
  );

  if (changed.length === 0) {
    return;
  }

  updateAppRuntimeState((state) => {
    for (const documentId of changed) {
      const file = state.documentFiles[documentId];
      if (file) {
        file.dirty = true;
      }
    }
  });
}

// Sync the runtime state with the persistent state by removing documents that
// were closed from the runtime state.
function forgetClosedDocuments(change: StateChange) {
  const gone = Object.keys(useAppRuntimeStore.getState().documentFiles).filter(
    (documentId) => !(documentId in change.state.documents),
  );
  if (gone.length === 0) {
    return;
  }

  updateAppRuntimeState((state) => {
    for (const documentId of gone) {
      delete state.documentFiles[EntityId(documentId)];
    }
  });
}

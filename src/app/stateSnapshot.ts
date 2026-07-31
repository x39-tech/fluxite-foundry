import * as z from "zod";
import { assetStorage, AssetDump } from "./assetStorage";
import { VERSION as STATE_VERSION } from "./persistentState";
import { PERSISTENT_STATE_STORAGE_KEY, useAppPersistentStore } from "./store";
import { APP_NAME, APP_VERSION, BUILD_STRING } from "consts";

/**
 * State Snapshots
 *
 * A state snapshot is the entire persistent state, plus the contents of the
 * IndexedDB asset database, in a single JSON file. It exists to test state
 * migrations: export a snapshot from a build, then import it into a build with
 * newer state versions and inspect the migration report.
 *
 * An imported snapshot is written back to storage exactly as the persist
 * middleware would have written it, tagged with the version it was exported at,
 * and the app is reloaded.
 */

/** Version of the snapshot file format itself, not of the state inside it. */
export const SNAPSHOT_FORMAT_VERSION = 1;

const AssetMetaSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  originalFileName: z.string().optional(),
  dataId: z.number(),
});

const AssetDataSchema = z.object({
  id: z.number(),
  sha1: z.string(),
  sha256: z.string(),
  mediaType: z.string().optional(),
  /** Base64-encoded asset bytes. */
  data: z.string(),
});

const SnapshotAssetsSchema = z.object({
  meta: z.array(AssetMetaSchema),
  data: z.array(AssetDataSchema),
});

const StateSnapshotSchema = z.object({
  formatVersion: z.number().int().positive(),
  exportedAt: z.string().optional(),
  appVersion: z.string().optional(),
  buildString: z.string().optional(),
  stateVersion: z.number().int().positive(),
  state: z.record(z.string(), z.unknown()),
  assets: SnapshotAssetsSchema.optional(),
});

export type SnapshotAssets = z.infer<typeof SnapshotAssetsSchema>;

export interface StateSnapshot {
  formatVersion: number;
  exportedAt?: string;
  appVersion?: string;
  buildString?: string;
  /** The persistent state version the state below is written in. */
  stateVersion: number;
  state: unknown;
  /** Omitted when the snapshot was exported without assets. */
  assets?: SnapshotAssets;
}

/**
 * Capture the current persistent state, and optionally the asset database, as
 * a snapshot.
 */
export async function createStateSnapshot(
  includeAssets: boolean,
): Promise<StateSnapshot> {
  const assets = includeAssets
    ? encodeAssets(await assetStorage.dump())
    : undefined;

  return {
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    buildString: BUILD_STRING,
    stateVersion: STATE_VERSION,
    state: useAppPersistentStore.getState(),
    assets,
  };
}

export function stateSnapshotToBlob(snapshot: StateSnapshot): Blob {
  return new Blob([JSON.stringify(snapshot, null, 2)], {
    type: "application/json",
  });
}

export function stateSnapshotFileName(snapshot: StateSnapshot): string {
  const date = (snapshot.exportedAt ?? new Date().toISOString()).slice(0, 10);
  return `fluxite-foundry-state-v${snapshot.stateVersion}-${date}.json`;
}

/**
 * Parse and validate the contents of a snapshot file.
 *
 * @throws if the text is not a usable snapshot, with a message suitable for
 * showing to the user.
 */
export function parseStateSnapshot(text: string): StateSnapshot {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error("The selected file is not valid JSON.");
  }

  const result = StateSnapshotSchema.safeParse(json);
  if (!result.success) {
    throw new Error(
      `The selected file is not a ${APP_NAME} state snapshot: ${result.error.message}`,
    );
  }

  if (result.data.formatVersion > SNAPSHOT_FORMAT_VERSION) {
    throw new Error(
      `Snapshot format v${result.data.formatVersion} is newer than this build understands (v${SNAPSHOT_FORMAT_VERSION}).`,
    );
  }

  return result.data;
}

/**
 * Replace the stored state, and the asset database if the snapshot carries one,
 * with the contents of a snapshot.
 *
 * The running app is left untouched; call {@link reloadApp} afterwards to pick
 * the new state up and run migrations on it.
 */
export async function applyStateSnapshot(
  snapshot: StateSnapshot,
): Promise<void> {
  if (snapshot.assets) {
    await assetStorage.restore(decodeAssets(snapshot.assets));
  }

  localStorage.setItem(
    PERSISTENT_STATE_STORAGE_KEY,
    JSON.stringify({ state: snapshot.state, version: snapshot.stateVersion }),
  );
}

// ---------------------------------------------------------------------------
// Asset encoding
// ---------------------------------------------------------------------------

function encodeAssets(dump: AssetDump): SnapshotAssets {
  return {
    meta: dump.meta,
    data: dump.data.map(({ data, ...rest }) => ({
      ...rest,
      data: arrayBufferToBase64(data),
    })),
  };
}

function decodeAssets(assets: SnapshotAssets): AssetDump {
  return {
    meta: assets.meta,
    data: assets.data.map(({ data, ...rest }) => ({
      ...rest,
      data: base64ToArrayBuffer(data),
    })),
  };
}

// fromCharCode takes the bytes as arguments, so they are passed a chunk at a
// time to keep a large asset from overflowing the call stack.
const BASE64_CHUNK_SIZE = 0x8000;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += BASE64_CHUNK_SIZE) {
    binary += String.fromCharCode(...bytes.subarray(i, i + BASE64_CHUNK_SIZE));
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
    .buffer;
}

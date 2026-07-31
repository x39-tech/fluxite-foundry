import { describe, test, expect, beforeEach, vi } from "vitest";
import Dexie from "dexie";
import { assetStorage } from "./assetStorage";
import { useAppPersistentStore, PERSISTENT_STATE_STORAGE_KEY } from "./store";
import { VERSION as STATE_VERSION } from "./persistentState";
import {
  applyStateSnapshot,
  createStateSnapshot,
  parseStateSnapshot,
  SNAPSHOT_FORMAT_VERSION,
  StateSnapshot,
  stateSnapshotFileName,
  stateSnapshotToBlob,
} from "./stateSnapshot";
import { resetAppPersistentStore } from "test/utils";

function testData(content: string): ArrayBuffer {
  return new TextEncoder().encode(content).buffer;
}

function readData(buffer: ArrayBuffer): string {
  return new TextDecoder().decode(buffer);
}

/** A snapshot with only the fields an import actually requires. */
function minimalSnapshot(
  overrides: Partial<StateSnapshot> = {},
): StateSnapshot {
  return {
    formatVersion: SNAPSHOT_FORMAT_VERSION,
    stateVersion: 1,
    state: { appSettings: { theme: "dark" } },
    ...overrides,
  };
}

describe("state snapshots", () => {
  const originalConsoleWarn = console.warn;

  beforeEach(async () => {
    // Suppress "Another connection wants to delete database" warnings
    console.warn = vi.fn((message) => {
      if (
        typeof message === "string" &&
        !message.includes("Another connection wants to delete")
      ) {
        originalConsoleWarn(message);
      }
    });

    await Dexie.delete("FFResourceAssets");
    localStorage.clear();
    resetAppPersistentStore();
  });

  describe("createStateSnapshot", () => {
    test("captures the current state and its version", async () => {
      useAppPersistentStore.setState((state) => ({
        appSettings: { ...state.appSettings, locale: "fr-FR" },
      }));

      const snapshot = await createStateSnapshot(false);

      expect(snapshot.formatVersion).toBe(SNAPSHOT_FORMAT_VERSION);
      expect(snapshot.stateVersion).toBe(STATE_VERSION);
      expect(snapshot.state).toEqual(useAppPersistentStore.getState());
      expect(snapshot.assets).toBeUndefined();
    });

    test("includes stored assets when asked to", async () => {
      await assetStorage.storeAsset(
        testData("asset contents"),
        "text/plain",
        "asset.txt",
      );

      const snapshot = await createStateSnapshot(true);

      expect(snapshot.assets?.meta).toHaveLength(1);
      expect(snapshot.assets?.data).toHaveLength(1);
      expect(snapshot.assets?.meta[0].originalFileName).toBe("asset.txt");
      // Asset bytes are base64 encoded so they survive JSON
      expect(snapshot.assets?.data[0].data).toBe(btoa("asset contents"));
    });

    test("survives a round trip through the file format", async () => {
      await assetStorage.storeAsset(testData("asset contents"), "text/plain");
      const snapshot = await createStateSnapshot(true);

      const parsed = parseStateSnapshot(
        await stateSnapshotToBlob(snapshot).text(),
      );

      expect(parsed).toEqual(snapshot);
    });
  });

  describe("parseStateSnapshot", () => {
    test("accepts a snapshot from an older state version", () => {
      const parsed = parseStateSnapshot(
        JSON.stringify(minimalSnapshot({ stateVersion: 1 })),
      );

      expect(parsed.stateVersion).toBe(1);
      expect(parsed.state).toEqual({ appSettings: { theme: "dark" } });
    });

    test("rejects a file that is not JSON", () => {
      expect(() => parseStateSnapshot("not json at all")).toThrow(
        /not valid JSON/,
      );
    });

    test("rejects JSON that is not a snapshot", () => {
      expect(() =>
        parseStateSnapshot(JSON.stringify({ hello: "world" })),
      ).toThrow(/not a .* state snapshot/);
    });

    test("rejects a snapshot from a newer file format", () => {
      const snapshot = minimalSnapshot({
        formatVersion: SNAPSHOT_FORMAT_VERSION + 1,
      });

      expect(() => parseStateSnapshot(JSON.stringify(snapshot))).toThrow(
        /newer than this build/,
      );
    });
  });

  describe("applyStateSnapshot", () => {
    test("stores the state where the app loads it from, tagged with its version", async () => {
      await applyStateSnapshot(minimalSnapshot({ stateVersion: 1 }));

      const stored: unknown = JSON.parse(
        localStorage.getItem(PERSISTENT_STATE_STORAGE_KEY)!,
      );

      // Matches the shape zustand's persist middleware writes, so the next load
      // migrates it like any other persisted state
      expect(stored).toEqual({
        state: { appSettings: { theme: "dark" } },
        version: 1,
      });
    });

    test("replaces the asset database with the assets from the snapshot", async () => {
      const staleId = await assetStorage.storeAsset(testData("stale asset"));
      const snapshot = await createStateSnapshot(true);

      const importedId = await assetStorage.storeAsset(testData("new asset"));
      const snapshotWithNewAsset = await createStateSnapshot(true);
      await applyStateSnapshot(snapshot);
      expect(await assetStorage.getAsset(importedId)).toBeUndefined();

      await applyStateSnapshot(snapshotWithNewAsset);

      expect(readData((await assetStorage.getAsset(staleId))!.data)).toBe(
        "stale asset",
      );
      expect(readData((await assetStorage.getAsset(importedId))!.data)).toBe(
        "new asset",
      );
    });

    test("leaves stored assets alone when the snapshot has none", async () => {
      const assetId = await assetStorage.storeAsset(testData("keep me"));

      await applyStateSnapshot(minimalSnapshot());

      expect(readData((await assetStorage.getAsset(assetId))!.data)).toBe(
        "keep me",
      );
    });
  });

  describe("stateSnapshotFileName", () => {
    test("names the file after the state version and export date", () => {
      const name = stateSnapshotFileName(
        minimalSnapshot({
          stateVersion: 2,
          exportedAt: "2026-07-31T12:00:00Z",
        }),
      );

      expect(name).toBe("fluxite-foundry-state-v2-2026-07-31.json");
    });
  });
});

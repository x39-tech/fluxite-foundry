import { describe, test, expect, beforeEach, vi } from "vitest";
import Dexie from "dexie";
import { assetStorage } from "./assetStorage";

// Helper to create test data
function createTestData(content: string): ArrayBuffer {
  const encoder = new TextEncoder();
  return encoder.encode(content).buffer;
}

// Helper to read ArrayBuffer as text
function readArrayBuffer(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder();
  return decoder.decode(buffer);
}

describe("AssetStorage", () => {
  // Suppress Dexie connection warnings in tests
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

    // Clear the database before each test
    await Dexie.delete("FFResourceAssets");
  });

  describe("storeAsset", () => {
    test("stores a new asset and returns an id", async () => {
      const data = createTestData("test content");
      const id = await assetStorage.storeAsset(data, "text/plain", "test.txt");

      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
    });

    test("stores asset with correct metadata", async () => {
      const data = createTestData("test content");
      const mediaType = "text/plain";
      const fileName = "test.txt";

      const id = await assetStorage.storeAsset(data, mediaType, fileName);
      const retrieved = await assetStorage.getAsset(id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.id).toBe(id);
      expect(retrieved!.mediaType).toBe(mediaType);
      expect(retrieved!.originalFileName).toBe(fileName);
      expect(readArrayBuffer(retrieved!.data)).toBe("test content");
      expect(retrieved!.timestamp).toBeLessThanOrEqual(Date.now());
    });

    test("stores asset without optional metadata", async () => {
      const data = createTestData("test content");
      const id = await assetStorage.storeAsset(data);
      const retrieved = await assetStorage.getAsset(id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.mediaType).toBeUndefined();
      expect(retrieved!.originalFileName).toBeUndefined();
    });

    test("deduplicates assets with same content and media type", async () => {
      const data = createTestData("duplicate content");
      const mediaType = "text/plain";

      const id1 = await assetStorage.storeAsset(data, mediaType, "file1.txt");
      const id2 = await assetStorage.storeAsset(data, mediaType, "file2.txt");

      // IDs should be different (different metadata)
      expect(id1).not.toBe(id2);

      // But storage info should show deduplication
      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(2); // Two metadata entries
      expect(info.totalSize).toBe(data.byteLength); // But only one copy of data
    });

    test("does NOT deduplicate assets with same content but different media types", async () => {
      const data = createTestData("same content");

      await assetStorage.storeAsset(data, "text/plain");
      await assetStorage.storeAsset(data, "application/json");

      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(2);
      expect(info.totalSize).toBe(data.byteLength * 2); // Two copies of data
    });

    test("computes SHA-1 and SHA-256 checksums", async () => {
      const data = createTestData("test content");
      const id = await assetStorage.storeAsset(data);
      const retrieved = await assetStorage.getAsset(id);

      expect(retrieved!.sha1).toBeTruthy();
      expect(retrieved!.sha256).toBeTruthy();
      expect(retrieved!.sha1).toMatch(/^[a-f0-9]{40}$/); // 40 hex chars
      expect(retrieved!.sha256).toMatch(/^[a-f0-9]{64}$/); // 64 hex chars
    });

    test("stores multiple different assets correctly", async () => {
      const data1 = createTestData("content 1");
      const data2 = createTestData("content 2");
      const data3 = createTestData("content 3");

      const id1 = await assetStorage.storeAsset(data1, "text/plain");
      const id2 = await assetStorage.storeAsset(data2, "text/html");
      const id3 = await assetStorage.storeAsset(data3, "application/json");

      const retrieved1 = await assetStorage.getAsset(id1);
      const retrieved2 = await assetStorage.getAsset(id2);
      const retrieved3 = await assetStorage.getAsset(id3);

      expect(readArrayBuffer(retrieved1!.data)).toBe("content 1");
      expect(readArrayBuffer(retrieved2!.data)).toBe("content 2");
      expect(readArrayBuffer(retrieved3!.data)).toBe("content 3");
    });
  });

  describe("getAsset", () => {
    test("retrieves stored asset", async () => {
      const data = createTestData("retrieve me");
      const id = await assetStorage.storeAsset(data, "text/plain", "test.txt");
      const retrieved = await assetStorage.getAsset(id);

      expect(retrieved).toBeTruthy();
      expect(readArrayBuffer(retrieved!.data)).toBe("retrieve me");
    });

    test("returns undefined for non-existent asset", async () => {
      const retrieved = await assetStorage.getAsset(
        "00000000-0000-0000-0000-000000000000",
      );
      expect(retrieved).toBeUndefined();
    });

    test("returns undefined for invalid id", async () => {
      const retrieved = await assetStorage.getAsset("invalid-id");
      expect(retrieved).toBeUndefined();
    });
  });

  describe("deleteAsset", () => {
    test("deletes an asset", async () => {
      const data = createTestData("to be deleted");
      const id = await assetStorage.storeAsset(data);

      await assetStorage.deleteAsset(id);
      const retrieved = await assetStorage.getAsset(id);

      expect(retrieved).toBeUndefined();
    });

    test("deletes asset metadata but keeps data when referenced by other assets", async () => {
      const data = createTestData("shared data");
      const mediaType = "text/plain";

      const id1 = await assetStorage.storeAsset(data, mediaType, "file1.txt");
      const id2 = await assetStorage.storeAsset(data, mediaType, "file2.txt");

      // Delete first asset
      await assetStorage.deleteAsset(id1);

      // First asset should be gone
      expect(await assetStorage.getAsset(id1)).toBeUndefined();

      // Second asset should still exist with data
      const retrieved2 = await assetStorage.getAsset(id2);
      expect(retrieved2).toBeTruthy();
      expect(readArrayBuffer(retrieved2!.data)).toBe("shared data");

      // Storage should still show the deduplicated data
      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(1);
      expect(info.totalSize).toBe(data.byteLength);
    });

    test("deletes asset data when last reference is removed", async () => {
      const data = createTestData("shared data");
      const mediaType = "text/plain";

      const id1 = await assetStorage.storeAsset(data, mediaType, "file1.txt");
      const id2 = await assetStorage.storeAsset(data, mediaType, "file2.txt");

      // Delete both assets
      await assetStorage.deleteAsset(id1);
      await assetStorage.deleteAsset(id2);

      // Both should be gone
      expect(await assetStorage.getAsset(id1)).toBeUndefined();
      expect(await assetStorage.getAsset(id2)).toBeUndefined();

      // Storage should be empty
      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(0);
      expect(info.totalSize).toBe(0);
    });

    test("does nothing when deleting non-existent asset", async () => {
      // Should not throw
      await expect(
        assetStorage.deleteAsset("00000000-0000-0000-0000-000000000000"),
      ).resolves.not.toThrow();
    });

    test("handles deleting multiple different assets", async () => {
      const data1 = createTestData("content 1");
      const data2 = createTestData("content 2");

      const id1 = await assetStorage.storeAsset(data1);
      const id2 = await assetStorage.storeAsset(data2);

      await assetStorage.deleteAsset(id1);

      expect(await assetStorage.getAsset(id1)).toBeUndefined();
      expect(await assetStorage.getAsset(id2)).toBeTruthy();

      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(1);
    });
  });

  describe("getStorageInfo", () => {
    test("returns zero count and size for empty storage", async () => {
      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(0);
      expect(info.totalSize).toBe(0);
    });

    test("returns correct count and size for single asset", async () => {
      const data = createTestData("test content");
      await assetStorage.storeAsset(data);

      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(1);
      expect(info.totalSize).toBe(data.byteLength);
    });

    test("returns correct count and size for multiple unique assets", async () => {
      const data1 = createTestData("content 1");
      const data2 = createTestData("content 2");
      const data3 = createTestData("content 3");

      await assetStorage.storeAsset(data1);
      await assetStorage.storeAsset(data2);
      await assetStorage.storeAsset(data3);

      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(3);
      expect(info.totalSize).toBe(
        data1.byteLength + data2.byteLength + data3.byteLength,
      );
    });

    test("counts deduplicated assets correctly", async () => {
      const data = createTestData("duplicate content");
      const mediaType = "text/plain";

      await assetStorage.storeAsset(data, mediaType, "file1.txt");
      await assetStorage.storeAsset(data, mediaType, "file2.txt");
      await assetStorage.storeAsset(data, mediaType, "file3.txt");

      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(3); // Three metadata entries
      expect(info.totalSize).toBe(data.byteLength); // But only one copy of data
    });

    test("handles mix of deduplicated and unique assets", async () => {
      const shared = createTestData("shared");
      const unique1 = createTestData("unique1");
      const unique2 = createTestData("unique2");

      await assetStorage.storeAsset(shared, "text/plain", "shared1.txt");
      await assetStorage.storeAsset(shared, "text/plain", "shared2.txt");
      await assetStorage.storeAsset(unique1, "text/plain", "unique1.txt");
      await assetStorage.storeAsset(unique2, "text/plain", "unique2.txt");

      const info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(4); // Four metadata entries
      expect(info.totalSize).toBe(
        shared.byteLength + unique1.byteLength + unique2.byteLength,
      ); // Three unique data entries
    });

    test("updates correctly after deletions", async () => {
      const data = createTestData("test");
      const id1 = await assetStorage.storeAsset(data);
      const id2 = await assetStorage.storeAsset(data);

      let info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(2);

      await assetStorage.deleteAsset(id1);

      info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(1);

      await assetStorage.deleteAsset(id2);

      info = await assetStorage.getStorageInfo();
      expect(info.count).toBe(0);
      expect(info.totalSize).toBe(0);
    });
  });

  describe("edge cases", () => {
    test("handles empty ArrayBuffer", async () => {
      const data = new ArrayBuffer(0);
      const id = await assetStorage.storeAsset(data);
      const retrieved = await assetStorage.getAsset(id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.data.byteLength).toBe(0);
    });

    test("handles large content", async () => {
      // Create 1MB of data
      const largeData = new ArrayBuffer(1024 * 1024);
      const view = new Uint8Array(largeData);
      for (let i = 0; i < view.length; i++) {
        view[i] = i % 256;
      }

      const id = await assetStorage.storeAsset(
        largeData,
        "application/octet-stream",
      );
      const retrieved = await assetStorage.getAsset(id);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.data.byteLength).toBe(1024 * 1024);

      const info = await assetStorage.getStorageInfo();
      expect(info.totalSize).toBe(1024 * 1024);
    });

    test("handles special characters in filenames", async () => {
      const data = createTestData("test");
      const specialName = "test file (1) [copy] #2.txt";

      const id = await assetStorage.storeAsset(data, "text/plain", specialName);
      const retrieved = await assetStorage.getAsset(id);

      expect(retrieved!.originalFileName).toBe(specialName);
    });

    test("generates unique checksums for different content", async () => {
      const data1 = createTestData("content A");
      const data2 = createTestData("content B");

      const id1 = await assetStorage.storeAsset(data1);
      const id2 = await assetStorage.storeAsset(data2);

      const asset1 = await assetStorage.getAsset(id1);
      const asset2 = await assetStorage.getAsset(id2);

      expect(asset1!.sha256).not.toBe(asset2!.sha256);
      expect(asset1!.sha1).not.toBe(asset2!.sha1);
    });

    test("generates identical checksums for identical content", async () => {
      const data1 = createTestData("identical");
      const data2 = createTestData("identical");

      const id1 = await assetStorage.storeAsset(data1, "text/plain");
      const id2 = await assetStorage.storeAsset(data2, "text/plain");

      const asset1 = await assetStorage.getAsset(id1);
      const asset2 = await assetStorage.getAsset(id2);

      expect(asset1!.sha256).toBe(asset2!.sha256);
      expect(asset1!.sha1).toBe(asset2!.sha1);
    });
  });
});

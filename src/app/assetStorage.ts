import Dexie, { EntityTable, Table } from "dexie";

export interface Asset {
  id: string;
  timestamp: number;
  mediaType?: string;
  data: ArrayBuffer;
  originalFileName?: string;
  sha1: string;
  sha256: string;
}

export interface AssetMeta {
  id: string;
  timestamp: number;
  originalFileName?: string;
  dataId: number;
}

export interface AssetData {
  id: number;
  sha1: string;
  sha256: string;
  mediaType?: string;
  data: ArrayBuffer;
}

export interface AssetDump {
  meta: AssetMeta[];
  data: AssetData[];
}

class AssetDatabase extends Dexie {
  assetMeta!: Table<AssetMeta>;
  assetData!: EntityTable<AssetData, "id">;

  constructor() {
    super("FFResourceAssets");

    this.version(1).stores({
      assetMeta: "id, timestamp, originalFileName, dataId",
      assetData: "++id, sha1, sha256, mediaType, [sha256+mediaType]",
    });
  }
}

class AssetStorageManager {
  private db = new AssetDatabase();

  private async computeChecksums(data: ArrayBuffer): Promise<{
    sha1: string;
    sha256: string;
  }> {
    const [sha1Hash, sha256Hash] = await Promise.all([
      crypto.subtle.digest("SHA-1", data),
      crypto.subtle.digest("SHA-256", data),
    ]);

    return {
      sha1: Array.from(new Uint8Array(sha1Hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
      sha256: Array.from(new Uint8Array(sha256Hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    };
  }

  async storeAsset(
    data: ArrayBuffer,
    mediaType?: string,
    originalFileName?: string,
  ): Promise<string> {
    const checksums = await this.computeChecksums(data);

    let dataId;

    const existingAssetData = await this.db.assetData.get({
      sha256: checksums.sha256,
      mediaType: mediaType,
    });

    if (existingAssetData) {
      dataId = existingAssetData.id;
    } else {
      dataId = await this.db.assetData.put({
        mediaType,
        sha1: checksums.sha1,
        sha256: checksums.sha256,
        data,
      });
    }

    const newId = crypto.randomUUID();
    await this.db.assetMeta.add({
      id: newId,
      timestamp: Date.now(),
      originalFileName,
      dataId,
    });

    return newId;
  }

  async getAsset(id: string): Promise<Asset | undefined> {
    const meta = await this.db.assetMeta.get(id);
    if (!meta) {
      return undefined;
    }

    const data = await this.db.assetData.get(meta.dataId);
    if (!data) {
      return undefined;
    }

    return {
      id: meta.id,
      timestamp: meta.timestamp,
      mediaType: data.mediaType,
      data: data.data,
      originalFileName: meta.originalFileName,
      sha1: data.sha1,
      sha256: data.sha256,
    };
  }

  async deleteAsset(id: string): Promise<void> {
    const meta = await this.db.assetMeta.get(id);
    if (!meta) {
      return;
    }

    const dataId = meta.dataId;
    await this.db.assetMeta.delete(id);

    if ((await this.db.assetMeta.where({ dataId: dataId }).count()) == 0) {
      await this.db.assetData.delete(dataId);
    }
  }

  /**
   * Read every record in the database, including the asset bytes themselves.
   *
   * This loads the whole database into memory, so it is only suitable for
   * moving the database somewhere else, like into a state snapshot file.
   */
  async dump(): Promise<AssetDump> {
    const [meta, data] = await Promise.all([
      this.db.assetMeta.toArray(),
      this.db.assetData.toArray(),
    ]);
    return { meta, data };
  }

  /**
   * Discard the current contents of the database and replace them with the
   * records from a dump.
   *
   * The asset data records are inserted with the primary keys they already
   * carry, rather than letting the table auto-increment fresh ones, because
   * each metadata record refers to its data by that key.
   */
  async restore(dump: AssetDump): Promise<void> {
    await this.db.transaction(
      "rw",
      this.db.assetMeta,
      this.db.assetData,
      async () => {
        await this.db.assetMeta.clear();
        await this.db.assetData.clear();
        await this.db.assetData.bulkAdd(dump.data);
        await this.db.assetMeta.bulkAdd(dump.meta);
      },
    );
  }

  async getStorageInfo(): Promise<{ count: number; totalSize: number }> {
    const count = await this.db.assetMeta.count();

    // Calculate total size from deduplicated asset data without loading into memory
    let totalSize = 0;
    await this.db.assetData.each((assetData) => {
      totalSize += assetData.data.byteLength;
    });

    return { count, totalSize };
  }

  // For testing: close the database connection
  async close(): Promise<void> {
    await this.db.close();
  }
}

// Export a singleton instance
export const assetStorage = new AssetStorageManager();

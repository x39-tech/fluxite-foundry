import { parseStateSnapshot, StateSnapshot } from "app/stateSnapshot";

export interface HistoricalSnapshot {
  /** File name, for test titles and failure messages. */
  fileName: string;
  /** The state version it is written at, taken from its file name. */
  version: number;
  snapshot: StateSnapshot;
}

const SNAPSHOT_FILE_PATTERN = /\/v(\d+)\.json$/;

const snapshotFiles = import.meta.glob("./v*.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function loadSnapshot(path: string, text: string): HistoricalSnapshot {
  const match = SNAPSHOT_FILE_PATTERN.exec(path);
  if (!match) {
    throw new Error(
      `Snapshot ${path} is not named vN.json; the history cannot tell what version it is.`,
    );
  }

  return {
    fileName: path.replace("./", ""),
    version: Number(match[1]),
    snapshot: parseStateSnapshot(text),
  };
}

export const SNAPSHOT_HISTORY: HistoricalSnapshot[] = Object.entries(
  snapshotFiles,
)
  .map(([path, text]) => loadSnapshot(path, text))
  .sort((a, b) => a.version - b.version);

export function getSnapshotFor(
  version: number,
): HistoricalSnapshot | undefined {
  return SNAPSHOT_HISTORY.find((entry) => entry.version === version);
}

// The snapshot each state version left behind, one per version the app has ever
// written state at.
//
// The snapshots come to several hundred kilobytes between them, and this
// module eagerly imports all of them, so make sure this file is only imported
// by tests to avoid blowing up the bundle size.

import { parseStateSnapshot, StateSnapshot } from "app/stateSnapshot";

export interface HistoricalSnapshot {
  /** Path within persistentState/, for test titles and failure messages. */
  fileName: string;
  /** The state version it is written at, taken from the directory it is in. */
  version: number;
  snapshot: StateSnapshot;
}

const SNAPSHOT_PATH_PATTERN = /\/v(\d+)\/snapshot\.json$/;

const snapshotFiles = import.meta.glob("./v*/snapshot.json", {
  eager: true,
  query: "?raw",
  import: "default",
}) as Record<string, string>;

function loadSnapshot(path: string, text: string): HistoricalSnapshot {
  const match = SNAPSHOT_PATH_PATTERN.exec(path);
  if (!match) {
    throw new Error(
      `Snapshot ${path} is not in a vN directory, so there is no telling what version it is.`,
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

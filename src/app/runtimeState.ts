import { DmxDriver, DelverError } from "@cpwg-community/delver";
import { Patch } from "immer";
import { LibraryStore } from "codex/library";
import { EntityId } from "./persistentState";

export interface AppRuntimeState {
  // One DMX test driver per open device class document, keyed by the document's
  // id. A document with no DMX serializer has no entry.
  dmxControllers: Record<EntityId, DmxController>;
  libraries: LibraryStore;
  systemDarkModePreference: boolean;
  // Each document's undo/redo stack. See app/undo.ts
  history: Record<EntityId, DocumentHistory>;
}

export interface DocumentHistory {
  /** Changes that can be undone, oldest first. */
  undo: HistoryEntry[];
  /** Changes that have been undone and can be redone, oldest first. */
  redo: HistoryEntry[];
}

/** One change to one document, and what it takes to put it back either way. */
export interface HistoryEntry {
  /** What to call the change in the undo menu. */
  label?: string;
  patches: Patch[];
  inversePatches: Patch[];
  /**
   * The assets the document referred to on both sides of the change. See
   * app/assetLifecycle.ts.
   */
  assetIds: string[];
}

export type DmxController =
  | DmxControllerNotCreated
  | DmxControllerAvailable
  | DmxControllerError;

export interface DmxControllerNotCreated {
  state: "not-created";
}

export interface DmxControllerAvailable {
  state: "available";
  driver: DmxDriver;
}

export interface DmxControllerError {
  state: "error";
  error: DelverError;
}

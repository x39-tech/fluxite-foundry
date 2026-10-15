import { DmxDriver, DelverError } from "@cpwg-community/delver";
import { Patch } from "immer";
import { MessageDescriptor } from "@lingui/core";
import { LibraryStore } from "codex/library";
import { EntityId } from "./persistentState";

export interface AppRuntimeState {
  // One DMX test driver per open device class document, keyed by the document's
  // id. A document with no DMX serializer has no entry.
  dmxControllers: Record<EntityId, DmxController>;
  // Live sACN output from the DMX test controller (only possible on desktop).
  sacnOutput: SacnOutputState;
  // How each document's DMX test controller arranges its panels. A document
  // with no entry uses the default.
  dmxControllerLayouts: Record<EntityId, DmxControllerLayout>;
  libraries: LibraryStore;
  systemDarkModePreference: boolean;
  // Each document's undo/redo stack. See app/undo.ts
  history: Record<EntityId, DocumentHistory>;
  // The save file each document came from or was last written to. A document
  // with no entry has never been written to a file. See app/documentFile.ts
  documentFiles: Record<EntityId, DocumentFile>;
}

/** What a document knows about the save file it belongs to. */
export interface DocumentFile {
  /** The name of the file, including its extension. */
  fileName: string;
  /** Where the file is, when the platform says (only relevant on desktop). */
  path?: string;
  /**
   * Whether the document has changed since it was last read from or written to
   * that file, which is to say whether the file is out of date.
   */
  dirty: boolean;
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
  label?: MessageDescriptor;
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

// "horizontal" puts the DMX output beside the parameters, and "vertical" puts
// it above them.
export type DmxControllerLayout = "horizontal" | "vertical";

export interface SacnOutputState {
  // Each device class document's output settings.
  settings: Record<EntityId, SacnOutputSettings>;
  // The document whose test controller is transmitting. Only one transmits at
  // a time.
  activeDocumentId?: EntityId;
}

export interface SacnOutputSettings {
  // The name of the network interface to transmit from.
  interfaceName?: string;
  universe: number;
  // The start address at which to send the device's footprint (1 to 512).
  startAddress: number;
}

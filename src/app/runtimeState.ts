import { DmxDriver, DelverError } from "@cpwg-community/delver";
import { LibraryStore } from "codex/library";
import { EntityId } from "./persistentState";

export interface AppRuntimeState {
  // One DMX test driver per open device class document, keyed by the document's
  // id. A document with no DMX serializer has no entry.
  dmxControllers: Record<EntityId, DmxController>;
  libraries: LibraryStore;
  systemDarkModePreference: boolean;
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

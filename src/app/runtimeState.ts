import { DmxDriver, DelverError } from "@cpwg-community/delver";
import { LibraryStore } from "codex/library";

export interface AppRuntimeState {
  dmxController: DmxController;
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

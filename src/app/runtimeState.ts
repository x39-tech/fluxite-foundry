import { ParameterDatabase, Error as E173Error } from "e173";
import { CodexDatabase } from "codex/codexDatabase";

export interface AppRuntimeState {
  dmxController: DmxController;
  codexDatabase: CodexDatabase;
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
  db: ParameterDatabase;
}

export interface DmxControllerError {
  state: "error";
  error: E173Error;
}

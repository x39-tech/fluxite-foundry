import * as FlexLayout from "flexlayout-react";
import {
  DefinitionLocalization,
  DeviceClassInfo,
  DeviceLibrary,
  EstaDmx,
  Parameter,
  ParameterDatabase,
  Structure,
  Error as E173Error,
} from "e173";
import { UdrDatabase } from "udr/udrDatabase";

// ---------------------------------------------------------------------------
// Persistent State
// ---------------------------------------------------------------------------

// This ensures that the persistent application state is JSON-compatible, e.g. contains only basic
// JS objects.
// https://dev.to/nodge/mastering-type-safe-json-serialization-in-typescript-1g96

type JSONPrimitive = string | number | boolean | null | undefined;

type JSONValue =
  | JSONPrimitive
  | JSONValue[]
  | {
      [key: string]: JSONValue;
    };

type JSONCompatible<T> = unknown extends T
  ? never
  : {
      [P in keyof T]: T[P] extends JSONValue
        ? T[P]
        : T[P] extends NotAssignableToJson
          ? never
          : JSONCompatible<T[P]>;
    };

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
type NotAssignableToJson = bigint | symbol | Function;

export type AppPersistentState = JSONCompatible<AppPersistentStateUnvalidated>;

export interface AppPersistentStateUnvalidated {
  appSettings: AppSettings;
  openEditors: OpenEditors;
  deviceClassEditors: { [key: string]: DeviceClassEditorState };
  udrDatabase: UdrDatabase;
}

export interface OpenEditors {
  editors: OpenEditor[];
  selectedEditor: number;
}

export enum EditorType {
  DEVICE_CLASS = "deviceClass",
}

export interface OpenEditor {
  type: EditorType;
  id: string;
}

export interface AppSettings {
  darkMode: boolean;
}

export interface DeviceClassEditorState {
  deviceClassId: string;
  basicData: BasicData;
  libraries: Record<string, string>;
  deviceLibrary: DeviceLibrary;
  parameters: ParametersEditorState;
  structures: StructuresEditorState;
  dmx: DmxSerializerState;
  localizations: Record<string, DefinitionLocalization>;
  windowLayout: FlexLayout.IJsonRowNode;
}

export interface BasicData {
  "@description": string;
  publishDate: string;
  author: string;
  history: Record<string, string>;
  info: DeviceClassInfo;
}

export interface ParametersEditorState {
  itemEditorLayout: Array<ItemEditor>;
  parameters: Record<string, Parameter>;
}

export interface StructuresEditorState {
  itemEditorLayout: Array<ItemEditor>;
  structures: Record<string, Structure>;
}

export interface ItemEditor {
  id: string;
  udrId: string;
}

export interface DmxSerializerState {
  udr: EstaDmx;
}

// ---------------------------------------------------------------------------
// Runtime State
// ---------------------------------------------------------------------------

export interface AppRuntimeState {
  dmxController: DmxController;
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

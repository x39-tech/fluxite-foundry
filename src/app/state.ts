import * as FlexLayout from "flexlayout-react";
import { DeviceClassInfo, Parameter, Structure } from "e173";
import { UdrDatabase } from "udr/udrDatabase";
import { useAppStore } from "./store";

// This ensures that the application state is JSON-compatible, e.g. contains only basic
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

// eslint-disable-next-line @typescript-eslint/ban-types
type NotAssignableToJson = bigint | symbol | Function;

export type AppState = JSONCompatible<AppStateUnvalidated>;

export interface AppStateUnvalidated {
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
  parameters: ParametersEditorState;
  structures: StructuresEditorState;
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

export function useUdrDatabase(): UdrDatabase {
  return useAppStore((state) => state.udrDatabase);
}

export function useDarkMode(): boolean {
  return useAppStore((state) => state.appSettings.darkMode);
}

export function setDarkMode(darkMode: boolean) {
  useAppStore.setState((state) => {
    state.appSettings.darkMode = darkMode;
  });
}

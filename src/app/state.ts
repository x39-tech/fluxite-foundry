import * as FlexLayout from "flexlayout-react";
import {
  DeviceClassInfo,
  Parameter,
  Structure,
} from "generated/draft-2023-1/udr-document";
import { UdrDatabase } from "udr/udrDatabase";
import { useAppStore } from "./store";

export interface AppState {
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

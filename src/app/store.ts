import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { AppState } from "./state";
import { loadDefaultLibraries } from "udr/udrDatabase";

export const useAppStore = create<AppState>()(
  persist(immer(devtools(() => getDefaultState())), {
    name: "udr-builder-state",
    version: 0,
    migrate: () => {
      // Currently there is only one version, all other version numbers are errors
      return getDefaultState();
    },
  }),
);

function getDefaultState(): AppState {
  return {
    appSettings: {
      darkMode: getDefaultDarkModePreference(),
    },
    openEditors: {
      editors: [],
      selectedEditor: -1,
    },
    deviceClassEditors: {},
    udrDatabase: loadDefaultLibraries(),
  };
}

function getDefaultDarkModePreference(): boolean {
  // Check to see if Media-Queries are supported
  if (window.matchMedia) {
    // Check if the dark-mode Media-Query matches
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return true;
    } else {
      return false;
    }
  }
  return false;
}

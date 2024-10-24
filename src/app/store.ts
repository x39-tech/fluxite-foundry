import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { AppState } from "./state";
import { loadDefaultLibraries } from "udr/udrDatabase";

export const useAppStore = create<AppState>()(
  persist(immer(devtools(() => getDefaultState())), {
    name: "udr-builder-state",
    version: 3,
    migrate: (persistedState, version) => {
      // All state changes are breaking right now
      if (version == 3) {
        return persistedState;
      } else {
        // Future versions are an error
        return getDefaultState();
      }
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

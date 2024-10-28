import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { produce } from "immer";
import { AppPersistentState, AppRuntimeState } from "./state";
import { loadDefaultLibraries, UdrDatabase } from "udr/udrDatabase";
import {
  getCurrentEditor,
  updateDmxController,
} from "features/deviceClassEditor/state";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const useAppRuntimeStore = create<AppRuntimeState>()(
  devtools(() => getDefaultRuntimeState()),
);

export const useAppPersistentStore = create<AppPersistentState>()(
  persist(
    devtools(() => getDefaultState()),
    {
      name: "udr-builder-state",
      version: 4,
      migrate: (persistedState, version) => {
        // All state changes are breaking right now
        if (version == 4) {
          return persistedState;
        } else {
          // Future versions are an error
          return getDefaultState();
        }
      },
      onRehydrateStorage: () => {
        return (state, error) => {
          if (state && !error) {
            const currentEditor = getCurrentEditor(state);
            if (currentEditor) {
              updateDmxController(currentEditor);
            }
          }
        };
      },
    },
  ),
);

export function useUdrDatabase(): UdrDatabase {
  return useAppPersistentStore((state) => state.udrDatabase);
}

export function useDarkMode(): boolean {
  return useAppPersistentStore((state) => state.appSettings.darkMode);
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export function updateAppPersistentState(
  recipe: (state: AppPersistentState) => void,
) {
  useAppPersistentStore.setState(produce(recipe));
}

export function updateAppRuntimeState(
  recipe: (state: AppRuntimeState) => void,
) {
  useAppRuntimeStore.setState(produce(recipe));
}

export function setDarkMode(darkMode: boolean) {
  updateAppPersistentState((state) => {
    state.appSettings.darkMode = darkMode;
  });
}
function getDefaultState(): AppPersistentState {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

function getDefaultRuntimeState(): AppRuntimeState {
  return {
    dmxController: {
      state: "not-created",
    },
  };
}

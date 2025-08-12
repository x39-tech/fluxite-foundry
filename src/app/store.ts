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
      version: 5,
      migrate: (persistedState, version) => {
        if (typeof persistedState !== "object" || persistedState === null) {
          return getDefaultState();
        }

        // State changes before 4 are breaking
        // Starting at 4, we migrate
        if (version === 4) {
          return {
            ...persistedState,
            udrDatabase: {
              // @ts-expect-error We don't have any type for older states right now
              libraries: persistedState.udrDatabase.libraries,
            },
          };
        }
        if (version === 5) {
          return persistedState;
        }
        return getDefaultState();
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

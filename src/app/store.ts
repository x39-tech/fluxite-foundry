import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { produce } from "immer";
import { AppPersistentState, AppRuntimeState } from "./state";
import { loadDefaultLibraries, UdrDatabase } from "udr/udrDatabase";
import {
  getCurrentEditor,
  updateDmxController,
} from "features/deviceClassEditor/state";
import {
  CURRENT_STATE_VERSION,
  getDefaultState,
  migrateState,
} from "./stateMigrations";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export const useAppRuntimeStore = create<AppRuntimeState>()(
  devtools(() => getDefaultRuntimeState(), { name: "ff-runtime-state" }),
);

export const useAppPersistentStore = create<AppPersistentState>()(
  persist(
    devtools(() => getDefaultState(), { name: "ff-persistent-state" }),
    {
      name: "ff-persistent-state",
      version: CURRENT_STATE_VERSION,
      migrate: migrateState,
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
  return useAppRuntimeStore((state) => state.udrDatabase);
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultRuntimeState(): AppRuntimeState {
  return {
    dmxController: {
      state: "not-created",
    },
    udrDatabase: loadDefaultLibraries(),
  };
}

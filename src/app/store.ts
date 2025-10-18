import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { produce } from "immer";
import { AppRuntimeState } from "./runtimeState";
import { loadDefaultLibraries, CodexDatabase } from "codex/codexDatabase";
import {
  getCurrentEditor,
  updateDmxController,
} from "features/deviceClassEditor/state";
import {
  VERSION as STATE_VERSION,
  getDefaultState,
  migrateState,
  AppPersistentState,
  Theme,
} from "./persistentState";

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
      name: "ff-persistent-state-gen2",
      version: STATE_VERSION,
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

export function useUdrDatabase(): CodexDatabase {
  return useAppRuntimeStore((state) => state.udrDatabase);
}

export function useTheme(): Theme {
  return useAppPersistentStore((state) => state.appSettings.theme);
}

export function useSystemDarkModePreference(): boolean {
  return useAppRuntimeStore((state) => state.systemDarkModePreference);
}

/**
 * Returns whether dark mode is currently active.
 * This is computed from the theme setting:
 * - "dark" → true
 * - "light" → false
 * - "system" → matches system preference (reactive to OS changes)
 */
export function useDarkMode(): boolean {
  const theme = useTheme();
  const systemPreference = useSystemDarkModePreference();

  if (theme === "system") {
    return systemPreference;
  }
  return theme === "dark";
}

export function useCurrentLocale(): string {
  return useAppPersistentStore((state) => state.appSettings.locale);
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

export function setTheme(theme: Theme) {
  updateAppPersistentState((state) => {
    state.appSettings.theme = theme;
  });
}

export function setSystemDarkModePreference(isDark: boolean) {
  updateAppRuntimeState((state) => {
    state.systemDarkModePreference = isDark;
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSystemDarkModePreference(): boolean {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }
  return false;
}

function getDefaultRuntimeState(): AppRuntimeState {
  return {
    dmxController: {
      state: "not-created",
    },
    udrDatabase: loadDefaultLibraries(),
    systemDarkModePreference: getSystemDarkModePreference(),
  };
}

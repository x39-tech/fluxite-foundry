import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import { Patch, produce, produceWithPatches } from "immer";
import { AppRuntimeState } from "./runtimeState";
import { loadDefaultLibraries } from "codex/libraryStore";
import { LibraryStore } from "codex/library";
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

export const PERSISTENT_STATE_STORAGE_KEY = "ff-persistent-state-gen2";

export const useAppPersistentStore = create<AppPersistentState>()(
  persist(
    devtools(() => getDefaultState(), { name: "ff-persistent-state" }),
    {
      name: PERSISTENT_STATE_STORAGE_KEY,
      version: STATE_VERSION,
      migrate: migrateState,
    },
  ),
);

export function useLibraryStore(): LibraryStore {
  return useAppRuntimeStore((state) => state.libraries);
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

export type StatePatchListener = (
  patches: Patch[],
  inversePatches: Patch[],
) => void;

const patchListeners = new Set<StatePatchListener>();

/**
 * Every change to the persistent state goes through here.
 *
 * Listeners run once the store has been updated, and only when the recipe
 * actually changed something.
 */
export function updateAppPersistentState(
  recipe: (state: AppPersistentState) => void,
) {
  let produced: { patches: Patch[]; inversePatches: Patch[] } | undefined;

  useAppPersistentStore.setState((state) => {
    const [nextState, patches, inversePatches] = produceWithPatches(
      state,
      recipe,
    );
    produced = { patches, inversePatches };
    return nextState;
  });

  if (!produced || produced.patches.length === 0) {
    return;
  }

  for (const listener of patchListeners) {
    listener(produced.patches, produced.inversePatches);
  }
}

/**
 * Registers a listener for the patches describing each persistent state update,
 * and returns a function that removes it again.
 */
export function subscribeToStatePatches(
  listener: StatePatchListener,
): () => void {
  patchListeners.add(listener);
  return () => {
    patchListeners.delete(listener);
  };
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
    dmxControllers: {},
    libraries: loadDefaultLibraries(),
    systemDarkModePreference: getSystemDarkModePreference(),
  };
}

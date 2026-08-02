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

/** One change made to the persistent state. */
export interface StateChange {
  /** The patches that made the change. */
  patches: Patch[];
  /** The patches that put it back again. */
  inversePatches: Patch[];
  /** The state as it now stands. */
  state: AppPersistentState;
  /** The state as it stood before the change. */
  previousState: AppPersistentState;
  /**
   * What to call the change where a user can see it, in the undo menu for
   * instance. A change with no label is not one a user asked for by name.
   */
  label?: string;
  /**
   * Whether the change is an undo or a redo of an earlier one, rather than
   * something new. A replay must not be recorded as new history.
   */
  isReplay: boolean;
}

export interface UpdateOptions {
  /** {@link StateChange.label} */
  label?: string;
  /** {@link StateChange.isReplay} */
  isReplay?: boolean;
}

export type StatePatchListener = (change: StateChange) => void;

const patchListeners = new Set<StatePatchListener>();

/**
 * Every change to the persistent state goes through here.
 *
 * Listeners run once the store has been updated, and only when the recipe
 * actually changed something. Inside {@link asOneChange} they run once for the
 * group rather than once per update.
 */
export function updateAppPersistentState(
  recipe: (state: AppPersistentState) => void,
  options: UpdateOptions = {},
) {
  let produced: { patches: Patch[]; inversePatches: Patch[] } | undefined;
  let previousState: AppPersistentState | undefined;

  useAppPersistentStore.setState((state) => {
    previousState = state;

    const [nextState, patches, inversePatches] = produceWithPatches(
      state,
      recipe,
    );
    produced = { patches, inversePatches };
    return nextState;
  });

  if (!produced || !previousState || produced.patches.length === 0) {
    return;
  }

  if (activeChangeGroup) {
    activeChangeGroup.patches.push(...produced.patches);
    // Undoing the group means undoing its updates back to front, so each
    // update's own inverse goes in front of the ones already collected.
    activeChangeGroup.inversePatches.unshift(...produced.inversePatches);
    return;
  }

  notifyPatchListeners({
    ...produced,
    state: useAppPersistentStore.getState(),
    previousState,
    label: options.label,
    isReplay: options.isReplay ?? false,
  });
}

/**
 * Reports everything `body` changes as one change rather than as one per call
 * to {@link updateAppPersistentState}, so that a user action which touches
 * several entities is one entry in the undo history.
 *
 * The state is still updated one call at a time; this logic only affects patch
 * listeners registered using {@link subscribeToStatePatches}, e.g. undo/redo.
 */
export function asOneChange(label: string, body: () => void) {
  if (activeChangeGroup) {
    body();
    return;
  }

  const group: ActiveChangeGroup = {
    label,
    patches: [],
    inversePatches: [],
    previousState: useAppPersistentStore.getState(),
  };
  activeChangeGroup = group;

  try {
    body();
  } finally {
    activeChangeGroup = undefined;

    if (group.patches.length > 0) {
      notifyPatchListeners({
        patches: group.patches,
        inversePatches: group.inversePatches,
        state: useAppPersistentStore.getState(),
        previousState: group.previousState,
        label: group.label,
        isReplay: false,
      });
    }
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

// A group of updates that will be reported as one change. See asOneChange.
interface ActiveChangeGroup {
  label: string;
  patches: Patch[];
  inversePatches: Patch[];
  previousState: AppPersistentState;
}

let activeChangeGroup: ActiveChangeGroup | undefined;

function notifyPatchListeners(change: StateChange) {
  for (const listener of patchListeners) {
    listener(change);
  }
}

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
    history: {},
  };
}

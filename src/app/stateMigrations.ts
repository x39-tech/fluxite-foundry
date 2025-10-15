import { AppPersistentState } from "./state";
import { getDefaultWindowLayout } from "utils/utils";

export const CURRENT_STATE_VERSION = 8;

export function migrateState(persistedState: unknown, version: number): object {
  if (typeof persistedState !== "object" || persistedState === null) {
    return getDefaultState();
  }

  // State changes before 4 are breaking
  // Starting at 4, we migrate
  let state = persistedState;
  switch (version) {
    case 4:
      state = migrate4To5(state);
    // fallthrough
    case 5:
      state = migrate5To6(state);
    // fallthrough
    case 6:
      state = migrate6To7(state);
    // fallthrough
    case 7:
      state = migrate7To8(state);
      break;
    default:
      return getDefaultState();
  }

  return state;
}

// V5: Changed the format of UDR database to only contain a 'libraries' member
// Remove other members from the object
function migrate4To5(stateV4: object): object {
  return {
    ...stateV4,
    udrDatabase: {
      // @ts-expect-error We don't have any type for older states right now
      libraries: stateV4.udrDatabase.libraries,
    },
  };
}

// V6: Updated FlexLayout to an incompatible model version
function migrate5To6(stateV5: object): object {
  return {
    ...stateV5,
    deviceClassEditors: Object.fromEntries(
      // @ts-expect-error We don't have any type for older states right now
      Object.entries(stateV5.deviceClassEditors).map(([id, editor]) => {
        return [
          id,
          {
            // @ts-expect-error We don't have any type for older states right now
            ...editor,
            windowLayout: getDefaultWindowLayout(),
          },
        ];
      }),
    ),
  };
}

// V7:
// - Added resources to device class editors
// - Added deviceClassVersion to device class editors
// - Moved udrDatabase to runtime state
function migrate6To7(stateV6: object): object {
  // @ts-expect-error We don't have any type for older states right now
  const { udrDatabase, ...rest } = stateV6;

  return {
    ...rest,
    deviceClassEditors: Object.fromEntries(
      // @ts-expect-error We don't have any type for older states right now
      Object.entries(stateV6.deviceClassEditors).map(([id, editor]) => {
        return [
          id,
          {
            // @ts-expect-error We don't have any type for older states right now
            ...editor,
            deviceClassVersion: "1.0.0",
            resources: {
              itemEditorLayout: [],
              resources: {},
              resourceAssets: {},
            },
          },
        ];
      }),
    ),
  };
}

function migrate7To8(stateV7: object): object {
  const userId = crypto.randomUUID();

  return {
    ...stateV7,
    appSettings: {
      // @ts-expect-error We don't have any type for older states right now
      ...stateV7.appSettings,
      orgId: { type: "user", id: userId },
    },
    deviceClassEditors: Object.fromEntries(
      // @ts-expect-error We don't have any type for older states right now
      Object.entries(stateV7.deviceClassEditors).map(([id, editor]) => {
        return [
          id,
          {
            // @ts-expect-error We don't have any type for older states right now
            ...editor,
            orgId: { type: "user", id: userId },
          },
        ];
      }),
    ),
  };
}

export function getDefaultState(): AppPersistentState {
  return {
    appSettings: {
      darkMode: getDefaultDarkModePreference(),
      orgId: { type: "user", id: crypto.randomUUID() },
    },
    openEditors: {
      editors: [],
      selectedEditor: -1,
    },
    deviceClassEditors: {},
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

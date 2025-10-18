import { AppPersistentState as V1State } from "../v1/state";
import { AppPersistentState as V2State } from "./state";

/**
 * Migrates state from V1 to V2.
 *
 * Changes:
 * - appSettings.darkMode (boolean) → appSettings.theme ("light" | "dark" | "system")
 *   - true → "dark"
 *   - false → "light"
 */
export function migrateV1toV2(state: V1State): V2State {
  return {
    ...state,
    appSettings: {
      ...state.appSettings,
      theme: state.appSettings.darkMode ? "dark" : "light",
    },
  };
}

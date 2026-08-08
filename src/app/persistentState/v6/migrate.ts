import * as V5 from "../v5/state";
import * as V6 from "./state";

// v5 -> v6: introduce UI locale and rename authoring locale

/**
 * Migrates state from V5 to V6.
 *
 * Changes:
 * - `appSettings.locale` becomes `appSettings.authoringLocale`, keeping its
 *   value.
 * - `appSettings.uiLocale` is added, following the browser.
 */
export function migrateV5toV6(
  state: V5.AppPersistentState,
): V6.AppPersistentState {
  const { locale, ...appSettings } = state.appSettings;

  return {
    ...state,
    appSettings: {
      ...appSettings,
      authoringLocale: locale,
      uiLocale: "system",
    },
  };
}

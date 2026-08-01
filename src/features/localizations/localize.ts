import { DefinitionLocalization } from "@cpwg-community/delver";
import { LocalizationKey } from "app/persistentState";
import { LocalizationStrings } from "./types";

// Imports a localization table from the Fluxite Codex format into the app state
// format.
export function importLocalizations<T extends LocalizationStrings>(
  source: Record<string, DefinitionLocalization> | undefined,
  target: Record<LocalizationKey, T>,
  newEntry: () => T,
) {
  for (const [langId, localization] of Object.entries(source || {})) {
    for (const [keyStr, str] of Object.entries(localization.strings || {})) {
      const key = LocalizationKey(keyStr);
      target[key] ||= newEntry();
      target[key].strings[langId] = str;
    }
  }
}

// If locale is missing that means the value is a localization key which can
// be displayed as a fallback
export interface LocalizedString {
  value: string;
  locale?: string;
  desiredLocale: string;
}

export function localize(
  db: Record<LocalizationKey, LocalizationStrings>,
  key: LocalizationKey,
  desiredLocale: string,
): LocalizedString {
  const strings = db?.[key]?.strings;

  if (strings) {
    const desired = strings[desiredLocale];
    if (desired !== undefined) {
      return {
        value: desired,
        locale: desiredLocale,
        desiredLocale,
      };
    }

    const fallback = strings["en-US"];
    if (fallback !== undefined) {
      return {
        value: fallback,
        locale: "en-US",
        desiredLocale,
      };
    }
  }

  return {
    desiredLocale,
    value: key,
  };
}

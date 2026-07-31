import { DefinitionLocalization } from "@cpwg-community/delver";
import { LocalizationKey, LocalizationDb } from "app/persistentState";

/**
 * Recursively collects all values from keys that start with '@' in an object.
 *
 * This function traverses an object tree and finds all string values associated
 * with keys that begin with '@'. These keys follow the convention for localizable
 * content, where the key indicates the content type (e.g., '@name', '@friendlyName')
 * and the value is a localization key that references a string in the localizations map.
 *
 * @param obj - The object to search for localizable keys
 * @param accumulator - Optional Set to accumulate keys into. If not provided, a new Set is created.
 * @returns A Set containing all localization key values found
 *
 * @example
 * const command = {
 *   "@friendlyName": "loc_key_1",
 *   argumentChoices: {
 *     arg1: {
 *       additional: [
 *         { id: "choice1", "@name": "loc_key_2" }
 *       ]
 *     }
 *   }
 * };
 *
 * const keys = collectLocalizableKeys(command);
 * // Returns Set { "loc_key_1", "loc_key_2" }
 */
export function collectLocalizableKeys(
  obj: unknown,
  accumulator?: Set<string>,
): Set<string> {
  const keys = accumulator ?? new Set<string>();

  if (!obj || typeof obj !== "object") {
    return keys;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    for (const item of obj) {
      collectLocalizableKeys(item, keys);
    }
    return keys;
  }

  // Handle objects
  for (const [key, value] of Object.entries(obj)) {
    // If the key starts with '@', the value is a localization key
    if (key.startsWith("@") && typeof value === "string") {
      keys.add(value);
    }

    // Recursively search nested objects
    if (value && typeof value === "object") {
      collectLocalizableKeys(value, keys);
    }
  }

  return keys;
}

// Read-only view of a localization table (`Localization` without the items[]
// reference array).
export interface LocalizationStrings {
  strings: LocalizationDb;
}

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

import { DefinitionLocalization } from "@cpwg-community/delver";
import { nanoid } from "nanoid";
import {
  Localization,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { LocalizationStrings } from "./types";

// Imports a localization table from the Fluxite Codex format into the app state
// format, keeping the file's own keys.
//
// This is for an imported library, whose strings are only ever read. A document
// is imported with importDocumentLocalizations instead, because a document is
// edited and exported again and so needs keys that cannot go stale.
export function importLocalizations(
  source: Record<string, DefinitionLocalization> | undefined,
  target: Record<LocalizationKey, LocalizationStrings>,
) {
  for (const [langId, localization] of Object.entries(source || {})) {
    for (const [keyStr, str] of Object.entries(localization.strings || {})) {
      const key = LocalizationKey(keyStr);
      target[key] ||= { strings: LocalizationDbSchema.parse({}) };
      target[key].strings[langId] = str;
    }
  }
}

/**
 * Imports the category names from a localization table.
 *
 * Categories are localized in a namespace of their own, keyed by full category
 * identifier.
 */
export function importCategoryLocalizations(
  source: Record<string, DefinitionLocalization> | undefined,
): Record<string, LocalizationStrings> {
  const target: Record<string, LocalizationStrings> = {};

  for (const [langId, localization] of Object.entries(source || {})) {
    for (const [category, str] of Object.entries(
      localization.categories || {},
    )) {
      target[category] ||= { strings: LocalizationDbSchema.parse({}) };
      target[category].strings[langId] = str;
    }
  }

  return target;
}

/**
 * How the localization keys a Fluxite Codex file used map onto the newly
 * synthesized ones we generate.
 */
export interface ImportedLocalizationKeys {
  /** The document's key for a key the file used. */
  of(fileKey: string): LocalizationKey;
  of(fileKey: string | undefined): LocalizationKey | undefined;
}

/**
 * Imports a document's localization table, giving every string a fresh opaque
 * key and remembering what the file called it.
 */
export function importDocumentLocalizations(
  source: Record<string, DefinitionLocalization> | undefined,
  target: Record<LocalizationKey, Localization>,
): ImportedLocalizationKeys {
  const keys = new Map<string, LocalizationKey>();

  for (const [langId, localization] of Object.entries(source || {})) {
    for (const [fileKey, str] of Object.entries(localization.strings || {})) {
      let key = keys.get(fileKey);
      if (key === undefined) {
        key = LocalizationKey(nanoid());
        keys.set(fileKey, key);
        target[key] = {
          strings: LocalizationDbSchema.parse({}),
          exportKey: fileKey,
        };
      }
      target[key].strings[langId] = str;
    }
  }

  // A key an entity mentions but the file has no strings for is a dangling
  // reference. Keeping the file's own key for it leaves the reference exactly
  // as dangling as it was, and exports it back unchanged, rather than
  // replacing a name someone can recognise with an opaque id.
  function of(fileKey: string): LocalizationKey;
  function of(fileKey: string | undefined): LocalizationKey | undefined;
  function of(fileKey: string | undefined): LocalizationKey | undefined {
    if (fileKey === undefined) {
      return undefined;
    }
    return keys.get(fileKey) ?? LocalizationKey(fileKey);
  }

  return { of };
}

/**
 * A string resolved for display.
 *
 * `locale` is the locale the value actually came from, which is absent when
 * nothing was found and the value is the key itself. Compare it against
 * `desiredLocale` to tell whether the user is looking at a translation or at a
 * stand-in for one that does not exist yet.
 */
export interface LocalizedString {
  value: string;
  locale?: string;
  desiredLocale: string;
}

/**
 * Resolves a localization key to a string to show the user.
 *
 * Locales are tried in this order:
 *
 * 1. The desired locale exactly.
 * 2. Another locale of the same language ("de" or "de-AT" for a desired
 *    "de-DE"), preferring the bare language tag.
 * 3. The document's source locale, and then that locale's language, which is
 *    the locale the strings were authored in and so the one most likely to be
 *    filled in.
 * 4. Any locale the string does have, in a stable order.
 * 5. The key itself.
 *
 * @param sourceLocale the locale the owning document was authored in. Absent
 * for strings that come from an imported library rather than from a document.
 */
export function localize(
  db: Record<LocalizationKey, LocalizationStrings>,
  key: LocalizationKey,
  desiredLocale: string,
  sourceLocale?: string,
): LocalizedString {
  const strings = db?.[key]?.strings;

  if (strings) {
    const locale = resolveLocale(strings, desiredLocale, sourceLocale);
    if (locale !== undefined) {
      return { value: strings[locale], locale, desiredLocale };
    }
  }

  return { desiredLocale, value: key };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// The primary language subtag of a BCP 47 tag: "de" for "de-AT".
function languageOf(locale: string): string {
  return locale.split("-")[0];
}

// Which of the locales the string has should be used, or undefined if it has
// none at all.
function resolveLocale(
  strings: Record<string, string>,
  desiredLocale: string,
  sourceLocale: string | undefined,
): string | undefined {
  const available = Object.keys(strings).sort();
  if (available.length === 0) {
    return undefined;
  }

  const has = (locale: string | undefined) =>
    locale !== undefined && strings[locale] !== undefined ? locale : undefined;

  // Another locale of the same language, preferring the bare language tag over
  // a regional one so that "de" wins over "de-AT" for a desired "de-DE".
  const sameLanguageAs = (locale: string | undefined) => {
    if (locale === undefined) {
      return undefined;
    }
    const language = languageOf(locale);
    return (
      has(language) ??
      available.find((candidate) => languageOf(candidate) === language)
    );
  };

  return (
    has(desiredLocale) ??
    sameLanguageAs(desiredLocale) ??
    has(sourceLocale) ??
    sameLanguageAs(sourceLocale) ??
    available[0]
  );
}

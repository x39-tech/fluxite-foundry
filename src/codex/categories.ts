// Parameter class categories
//
// A parameter class's category consists of all '/'-separated segments before
// the last one. The CodexId for a Parameter Class is the category and ID
// together, and we split them to work with them separately.

import { LocalizationDbSchema, LocalizationKey } from "app/persistentState";
import { localize, LocalizedString } from "features/localizations/localize";
import { LocalizationStrings } from "features/localizations/types";

/** A path-separated category identifier, such as "color/cie-1931/xy". */
export type FullCategoryId = string;

/** Localized category names, keyed by full category identifier. */
export type CategoryLocalizations = Record<FullCategoryId, LocalizationStrings>;

const PATH_SEPARATOR = "/";

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/** The two parts a parameter class ID is made of. */
export interface ParameterClassIdParts {
  category: FullCategoryId;
  identifier: string;
}

/** Separates a parameter class ID into its category and its identifier. */
export function splitParameterClassId(codexId: string): ParameterClassIdParts {
  const separator = codexId.lastIndexOf(PATH_SEPARATOR);

  if (separator < 0) {
    return { category: "", identifier: codexId };
  }

  return {
    category: codexId.slice(0, separator),
    identifier: codexId.slice(separator + 1),
  };
}

/** Builds a parameter class ID from a category and an identifier. */
export function joinParameterClassId(
  category: FullCategoryId,
  identifier: string,
): string {
  return category ? `${category}${PATH_SEPARATOR}${identifier}` : identifier;
}

/** The segments of a category, outermost first. */
export function categorySegments(category: FullCategoryId): string[] {
  return category ? category.split(PATH_SEPARATOR) : [];
}

/** The last segment of a category, which is the part a name names. */
export function categoryLastSegment(category: FullCategoryId): string {
  const segments = categorySegments(category);
  return segments[segments.length - 1] ?? "";
}

/** The category this one sits inside, absent for a root category. */
export function parentCategory(
  category: FullCategoryId,
): FullCategoryId | undefined {
  const separator = category.lastIndexOf(PATH_SEPARATOR);
  return separator < 0 ? undefined : category.slice(0, separator);
}

/**
 * Every category from the root down to and including this one.
 *
 * So for "effects/animation/incline", would yield:
 * [
 *   "effects",
 *   "effects/animation",
 *   "effects/animation/incline",
 * ]
 */
export function categoryAncestry(category: FullCategoryId): FullCategoryId[] {
  const segments = categorySegments(category);
  return segments.map((_, index) =>
    segments.slice(0, index + 1).join(PATH_SEPARATOR),
  );
}

/**
 * Orders path-separated identifiers, such as categories and the parameter
 * class IDs built from them, so that a parent always comes before what sits
 * under it and siblings stay adjacent. That is what lets a flat list read as a
 * hierarchy.
 *
 * An identifier with no separator in it compares normally.
 */
export function comparePathIdentifiers(a: string, b: string): number {
  const aSegments = categorySegments(a);
  const bSegments = categorySegments(b);

  for (let i = 0; i < Math.min(aSegments.length, bSegments.length); i++) {
    const order = aSegments[i].localeCompare(bSegments[i]);
    if (order !== 0) {
      return order;
    }
  }

  return aSegments.length - bSegments.length;
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

// The identifier character set of E1.73-1. It excludes the space, the path
// separator, and !"#$.:;?@[\], and the standard reserves everything it leaves
// out for future use.
const IDENTIFIER_CHARS =
  "\\u{25}-\\u{2D}\\u{30}-\\u{39}\\u{3C}-\\u{3E}\\u{41}-\\u{5A}" +
  "\\u{5E}-\\u{7E}\\u{80}-\\u{D7FF}\\u{E000}-\\u{10FFFF}";

const IDENTIFIER = new RegExp(`^[${IDENTIFIER_CHARS}]+$`, "u");
const NOT_IDENTIFIER_CHAR = new RegExp(`[^${IDENTIFIER_CHARS}]`, "u");

/** Whether a string is a legal identifier under section 5.1. */
export function isIdentifier(value: string): boolean {
  return IDENTIFIER.test(value);
}

/**
 * The first character of a string that an identifier may not contain, so that
 * validation can say which one is the problem. Absent when the string is a
 * legal identifier, and for an empty string, which is invalid for a different
 * reason.
 */
export function firstInvalidIdentifierCharacter(
  value: string,
): string | undefined {
  return NOT_IDENTIFIER_CHAR.exec(value)?.[0];
}

/** Whether a string is a legal full category identifier. */
export function isFullCategoryId(value: string): boolean {
  const segments = categorySegments(value);
  return segments.length > 0 && segments.every(isIdentifier);
}

// ---------------------------------------------------------------------------
// Localization
// ---------------------------------------------------------------------------

/** The separator drawn between the parts of a category path. */
export const CATEGORY_PATH_SEPARATOR = " › ";

/**
 * Resolves the name of one category, which names only its last segment.
 *
 * If a localization does not exist, gives the last segment of the category
 * identifier.
 */
export function localizeCategory(
  db: CategoryLocalizations,
  category: FullCategoryId,
  locale: string,
  sourceLocale?: string,
): LocalizedString {
  const localized = localize(
    db as Record<LocalizationKey, LocalizationStrings>,
    LocalizationKey(category),
    locale,
    sourceLocale,
  );

  return localized.locale === undefined
    ? { ...localized, value: categoryLastSegment(category) }
    : localized;
}

/** The name of each category from the root down to this one. */
export function localizeCategoryPath(
  db: CategoryLocalizations,
  category: FullCategoryId,
  locale: string,
  sourceLocale?: string,
): LocalizedString[] {
  return categoryAncestry(category).map((ancestor) =>
    localizeCategory(db, ancestor, locale, sourceLocale),
  );
}

/** A localized category path as one string, for display. */
export function formatCategoryPath(path: LocalizedString[]): string {
  return path.map((part) => part.value).join(CATEGORY_PATH_SEPARATOR);
}

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------

/** One category the app knows about. */
export interface CategoryDefinition {
  id: FullCategoryId;
  /** The last segment of the identifier. */
  segment: string;
  /** Absent for a root category. */
  parent?: FullCategoryId;
  /** The libraries the category was found in, in the order they were given. */
  libraryIds: string[];
}

/** Every category the loaded libraries know about, and their names. */
export interface CategoryCatalog {
  /** Ordered by `comparePathIdentifiers`. */
  categories: CategoryDefinition[];
  localizations: CategoryLocalizations;
}

/** One library's contribution to the catalog. */
export interface CategorySource {
  libraryId: string;
  /** The parameter class IDs it defines, whose leading portions are categories. */
  parameterClassIds: Iterable<string>;
  /** The names it gives categories, whose keys are categories in their own right. */
  localizations?: CategoryLocalizations;
}

export function emptyCategoryCatalog(): CategoryCatalog {
  return { categories: [], localizations: {} };
}

/**
 * Gathers the categories of every loaded library into one list.
 *
 * Categories may be duplicated across libraries, and they are deduplicated
 * here. Localizations from the first encountered instance of each category are
 * used.
 */
export function buildCategoryCatalog(
  sources: Iterable<CategorySource>,
): CategoryCatalog {
  const definitions = new Map<FullCategoryId, CategoryDefinition>();
  const localizations: CategoryLocalizations = {};

  const note = (category: FullCategoryId, libraryId: string) => {
    for (const ancestor of categoryAncestry(category)) {
      const existing = definitions.get(ancestor);

      if (existing) {
        if (!existing.libraryIds.includes(libraryId)) {
          existing.libraryIds.push(libraryId);
        }
        continue;
      }

      definitions.set(ancestor, {
        id: ancestor,
        segment: categoryLastSegment(ancestor),
        parent: parentCategory(ancestor),
        libraryIds: [libraryId],
      });
    }
  };

  for (const source of sources) {
    for (const category of Object.keys(source.localizations ?? {})) {
      note(category, source.libraryId);
    }

    for (const codexId of source.parameterClassIds) {
      const { category } = splitParameterClassId(codexId);
      if (category) {
        note(category, source.libraryId);
      }
    }

    mergeCategoryLocalizations(localizations, source.localizations);
  }

  return {
    categories: [...definitions.values()].sort((a, b) =>
      comparePathIdentifiers(a.id, b.id),
    ),
    localizations,
  };
}

function mergeCategoryLocalizations(
  target: CategoryLocalizations,
  source: CategoryLocalizations | undefined,
): void {
  for (const [category, entry] of Object.entries(source ?? {})) {
    const existing = (target[category] ??= {
      strings: LocalizationDbSchema.parse({ ...entry.strings }),
    });

    for (const [locale, value] of Object.entries(entry.strings)) {
      existing.strings[locale] ??= value;
    }
  }
}

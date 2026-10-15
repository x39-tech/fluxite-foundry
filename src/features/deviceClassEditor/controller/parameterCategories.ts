// Filtering the test controller's parameters by the top level of their
// parameter class's category, e.g. "color" for "color/cie-1931/xy/x".

import {
  CategoryCatalog,
  categorySegments,
  FullCategoryId,
  splitParameterClassId,
} from "codex/categories";

/**
 * Which parameters to show. A filter is a string so that it can be the value
 * of a toggle group.
 *
 * - "all": every parameter.
 * - "other": parameters whose class does not have a category, or has a category
 *   which is not present in the well-known top-level categories.
 * - "category:<id>": parameters in the given top-level category. Category
 *   identifiers cannot contain ':', so these never collide with the others.
 */
export type CategoryFilter = "all" | "other" | `category:${FullCategoryId}`;

export const ALL_CATEGORIES: CategoryFilter = "all";
export const OTHER_CATEGORIES: CategoryFilter = "other";

const CATEGORY_PREFIX = "category:";

export function categoryFilter(category: FullCategoryId): CategoryFilter {
  return `${CATEGORY_PREFIX}${category}`;
}

/** The top-level category of a parameter class ID, if it has a category. */
export function topLevelCategory(
  parameterClassId: string,
): FullCategoryId | undefined {
  const { category } = splitParameterClassId(parameterClassId);
  return categorySegments(category)[0];
}

/** The categories at the root of the catalog's hierarchy, in catalog order. */
export function topLevelCategories(catalog: CategoryCatalog): FullCategoryId[] {
  return catalog.categories
    .filter((category) => category.parent === undefined)
    .map((category) => category.id);
}

/**
 * The filters that apply to a set of parameter classes.
 *
 * Always gives "all", then each known top-level category that at least one of
 * the parameter classes falls under, then "other" if it applies to at least one
 * parameter.
 */
export function availableCategoryFilters(
  parameterClassIds: Iterable<string>,
  knownCategories: FullCategoryId[],
): CategoryFilter[] {
  const used = new Set<FullCategoryId>();
  let hasOther = false;

  for (const classId of parameterClassIds) {
    const category = topLevelCategory(classId);
    if (category !== undefined && knownCategories.includes(category)) {
      used.add(category);
    } else {
      hasOther = true;
    }
  }

  return [
    ALL_CATEGORIES,
    ...knownCategories.filter((c) => used.has(c)).map(categoryFilter),
    ...(hasOther ? [OTHER_CATEGORIES] : []),
  ];
}

export function matchesCategoryFilter(
  parameterClassId: string,
  filter: CategoryFilter,
  knownCategories: FullCategoryId[],
): boolean {
  if (filter === ALL_CATEGORIES) {
    return true;
  }

  const category = topLevelCategory(parameterClassId);
  const known = category !== undefined && knownCategories.includes(category);

  if (filter === OTHER_CATEGORIES) {
    return !known;
  }
  return known && filter === categoryFilter(category);
}

/** The category a "category:<id>" filter selects, if it is one. */
export function filterCategory(
  filter: CategoryFilter,
): FullCategoryId | undefined {
  return filter.startsWith(CATEGORY_PREFIX)
    ? filter.slice(CATEGORY_PREFIX.length)
    : undefined;
}

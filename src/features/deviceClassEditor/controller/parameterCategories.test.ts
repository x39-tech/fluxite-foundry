import { describe, expect, test } from "vitest";
import {
  ALL_CATEGORIES,
  availableCategoryFilters,
  categoryFilter,
  matchesCategoryFilter,
  OTHER_CATEGORIES,
  topLevelCategory,
} from "./parameterCategories";

const KNOWN = ["color", "intensity", "motion"];

describe("topLevelCategory", () => {
  test("is the first segment of the category", () => {
    expect(topLevelCategory("color/cie-1931/xy/x")).toBe("color");
    expect(topLevelCategory("motion/pan")).toBe("motion");
  });

  test("is absent for a class with no category", () => {
    expect(topLevelCategory("fan-mode")).toBeUndefined();
  });
});

describe("availableCategoryFilters", () => {
  test("offers the known categories in use, in the order given", () => {
    expect(
      availableCategoryFilters(["motion/pan", "color/cyan"], KNOWN),
    ).toEqual([
      ALL_CATEGORIES,
      categoryFilter("color"),
      categoryFilter("motion"),
    ]);
  });

  test("offers other for classes with no known category", () => {
    expect(
      availableCategoryFilters(
        ["fan-mode", "custom/thing", "color/cyan"],
        KNOWN,
      ),
    ).toEqual([ALL_CATEGORIES, categoryFilter("color"), OTHER_CATEGORIES]);
  });
});

describe("matchesCategoryFilter", () => {
  test("matches a class under the category at any depth", () => {
    expect(
      matchesCategoryFilter(
        "color/cie-1931/xy/x",
        categoryFilter("color"),
        KNOWN,
      ),
    ).toBe(true);
    expect(
      matchesCategoryFilter("motion/pan", categoryFilter("color"), KNOWN),
    ).toBe(false);
  });

  test("matches classes outside the known categories with other", () => {
    expect(matchesCategoryFilter("fan-mode", OTHER_CATEGORIES, KNOWN)).toBe(
      true,
    );
    expect(matchesCategoryFilter("custom/thing", OTHER_CATEGORIES, KNOWN)).toBe(
      true,
    );
    expect(matchesCategoryFilter("color/cyan", OTHER_CATEGORIES, KNOWN)).toBe(
      false,
    );
  });

  test("matches everything with all", () => {
    expect(matchesCategoryFilter("fan-mode", ALL_CATEGORIES, KNOWN)).toBe(true);
    expect(matchesCategoryFilter("color/cyan", ALL_CATEGORIES, KNOWN)).toBe(
      true,
    );
  });
});

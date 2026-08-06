import { describe, expect, it } from "vitest";
import { LocalizationDbSchema } from "app/persistentState";
import {
  buildCategoryCatalog,
  CategoryLocalizations,
  categoryAncestry,
  categoryLastSegment,
  categorySegments,
  comparePathIdentifiers,
  firstInvalidIdentifierCharacter,
  formatCategoryPath,
  isFullCategoryId,
  isIdentifier,
  joinParameterClassId,
  localizeCategory,
  localizeCategoryPath,
  parentCategory,
  splitParameterClassId,
} from "./categories";

function names(
  entries: Record<string, Record<string, string>>,
): CategoryLocalizations {
  return Object.fromEntries(
    Object.entries(entries).map(([category, strings]) => [
      category,
      { strings: LocalizationDbSchema.parse(strings) },
    ]),
  );
}

describe("splitParameterClassId", () => {
  it("separates the category from the identifier", () => {
    expect(splitParameterClassId("color/cie-1931/xy/x")).toEqual({
      category: "color/cie-1931/xy",
      identifier: "x",
    });
  });

  it("separates an identifier in a root category", () => {
    expect(splitParameterClassId("intensity/dimmer")).toEqual({
      category: "intensity",
      identifier: "dimmer",
    });
  });

  it("reports no category for an ID that has none", () => {
    expect(splitParameterClassId("dimmer")).toEqual({
      category: "",
      identifier: "dimmer",
    });
  });
});

describe("joinParameterClassId", () => {
  it("joins a category and an identifier", () => {
    expect(joinParameterClassId("color/additive", "emitter")).toBe(
      "color/additive/emitter",
    );
  });

  it("leaves an identifier alone when there is no category", () => {
    expect(joinParameterClassId("", "emitter")).toBe("emitter");
  });

  it("round-trips with splitParameterClassId", () => {
    const parts = splitParameterClassId("shape/zoom/focus");
    expect(joinParameterClassId(parts.category, parts.identifier)).toBe(
      "shape/zoom/focus",
    );
  });
});

describe("category parts", () => {
  it("lists the segments outermost first", () => {
    expect(categorySegments("color/cie-1931/xy")).toEqual([
      "color",
      "cie-1931",
      "xy",
    ]);
  });

  it("names the last segment", () => {
    expect(categoryLastSegment("color/cie-1931/xy")).toBe("xy");
    expect(categoryLastSegment("color")).toBe("color");
  });

  it("finds the parent of a nested category", () => {
    expect(parentCategory("color/cie-1931/xy")).toBe("color/cie-1931");
  });

  it("reports no parent for a root category", () => {
    expect(parentCategory("color")).toBeUndefined();
  });

  it("walks the ancestry from the root down", () => {
    expect(categoryAncestry("color/cie-1931/xy")).toEqual([
      "color",
      "color/cie-1931",
      "color/cie-1931/xy",
    ]);
  });

  it("treats an empty category as having no segments", () => {
    expect(categorySegments("")).toEqual([]);
    expect(categoryAncestry("")).toEqual([]);
  });
});

describe("comparePathIdentifiers", () => {
  it("puts a parent before its children", () => {
    expect(comparePathIdentifiers("color", "color/additive")).toBeLessThan(0);
  });

  it("orders siblings by name", () => {
    expect(
      comparePathIdentifiers("color/additive", "color/subtractive"),
    ).toBeLessThan(0);
  });

  it("keeps a subtree together rather than interleaving it", () => {
    const sorted = ["color/select", "color-x", "color/additive", "color"].sort(
      comparePathIdentifiers,
    );

    // "color-x" is a root category of its own, so the whole "color" subtree
    // stays contiguous even though "color-x" sorts between the strings.
    expect(sorted).toEqual([
      "color",
      "color/additive",
      "color/select",
      "color-x",
    ]);
  });
});

describe("identifier validation", () => {
  it("accepts the identifiers the ESTA libraries use", () => {
    for (const identifier of ["dimmer", "cie-1931", "rate-fixed", "xy", "x"]) {
      expect(isIdentifier(identifier)).toBe(true);
    }
  });

  it("rejects the characters the standard reserves", () => {
    for (const identifier of [
      "with space",
      "with/separator",
      "with.delimiter",
      "with;modifier",
      "with?pointer",
      "with[instance]",
      "with@localizable",
    ]) {
      expect(isIdentifier(identifier)).toBe(false);
    }
  });

  it("rejects an empty identifier", () => {
    expect(isIdentifier("")).toBe(false);
  });

  it("accepts characters above the ASCII range", () => {
    expect(isIdentifier("zufällige-rate")).toBe(true);
    expect(isIdentifier("色")).toBe(true);
  });

  it("names the first character that is not allowed", () => {
    expect(firstInvalidIdentifierCharacter("my new item")).toBe(" ");
    expect(firstInvalidIdentifierCharacter("dimmer")).toBeUndefined();
  });

  it("accepts a full category of one or more segments", () => {
    expect(isFullCategoryId("color")).toBe(true);
    expect(isFullCategoryId("color/cie-1931/xy")).toBe(true);
  });

  it("rejects a full category with an empty or illegal segment", () => {
    expect(isFullCategoryId("")).toBe(false);
    expect(isFullCategoryId("color/")).toBe(false);
    expect(isFullCategoryId("color//additive")).toBe(false);
    expect(isFullCategoryId("color/with space")).toBe(false);
  });
});

describe("localizeCategory", () => {
  const db = names({
    color: { "en-US": "Color", "en-GB": "Colour", de: "Farbe" },
    "color/additive": { "en-US": "Additive" },
  });

  it("resolves the name in the requested locale", () => {
    expect(localizeCategory(db, "color", "de").value).toBe("Farbe");
  });

  it("falls back within the same language", () => {
    expect(localizeCategory(db, "color", "en-AU").value).toBe("Colour");
  });

  it("stands in with the last segment for a category nothing has named", () => {
    expect(localizeCategory(db, "color/cie-1931/xy", "en-US").value).toBe("xy");
  });

  it("reports no locale for a category nothing has named", () => {
    expect(
      localizeCategory(db, "color/select", "en-US").locale,
    ).toBeUndefined();
  });

  it("names each category from the root down", () => {
    const path = localizeCategoryPath(db, "color/additive", "en-US");
    expect(path.map((part) => part.value)).toEqual(["Color", "Additive"]);
  });

  it("formats a path with a separator between its parts", () => {
    const path = localizeCategoryPath(db, "color/additive", "en-US");
    expect(formatCategoryPath(path)).toBe("Color › Additive");
  });
});

describe("buildCategoryCatalog", () => {
  it("collects the categories a library names", () => {
    const catalog = buildCategoryCatalog([
      {
        libraryId: "org.esta.lib.intensity-color",
        parameterClassIds: [],
        localizations: names({ color: { "en-US": "Color" } }),
      },
    ]);

    expect(catalog.categories.map((category) => category.id)).toEqual([
      "color",
    ]);
  });

  it("collects categories from the parameter classes that use them", () => {
    const catalog = buildCategoryCatalog([
      {
        libraryId: "org.esta.lib.intensity-color",
        parameterClassIds: ["color/cie-1931/xy/x"],
      },
    ]);

    // Every level of the hierarchy exists, not only the one the class names.
    expect(catalog.categories.map((category) => category.id)).toEqual([
      "color",
      "color/cie-1931",
      "color/cie-1931/xy",
    ]);
  });

  it("describes where each category sits in the hierarchy", () => {
    const catalog = buildCategoryCatalog([
      {
        libraryId: "org.esta.lib.intensity-color",
        parameterClassIds: ["color/additive/emitter"],
      },
    ]);

    expect(catalog.categories[1]).toMatchObject({
      id: "color/additive",
      segment: "additive",
      parent: "color",
    });
    expect(catalog.categories[0].parent).toBeUndefined();
  });

  it("ignores a parameter class ID that carries no category", () => {
    const catalog = buildCategoryCatalog([
      { libraryId: "org.esta.lib.core", parameterClassIds: ["dimmer"] },
    ]);

    expect(catalog.categories).toEqual([]);
  });

  it("unions the categories of every library", () => {
    const catalog = buildCategoryCatalog([
      { libraryId: "org.esta.lib.intensity-color", parameterClassIds: [] },
      {
        libraryId: "org.esta.lib.motion",
        parameterClassIds: ["motion/pan-tilt/pan"],
      },
      {
        libraryId: "org.esta.lib.effect",
        parameterClassIds: ["motion/effect/rate"],
      },
    ]);

    expect(catalog.categories.map((category) => category.id)).toEqual([
      "motion",
      "motion/effect",
      "motion/pan-tilt",
    ]);
  });

  it("records every library a category was found in", () => {
    const catalog = buildCategoryCatalog([
      { libraryId: "org.esta.lib.motion", parameterClassIds: ["motion/pan"] },
      { libraryId: "org.esta.lib.effect", parameterClassIds: ["motion/rate"] },
    ]);

    expect(catalog.categories[0]).toMatchObject({
      id: "motion",
      libraryIds: ["org.esta.lib.motion", "org.esta.lib.effect"],
    });
  });

  it("keeps the name of the first library to give one in a locale", () => {
    const catalog = buildCategoryCatalog([
      {
        libraryId: "org.esta.lib.intensity-color",
        parameterClassIds: [],
        localizations: names({ color: { "en-US": "Color" } }),
      },
      {
        libraryId: "org.esta.lib.effect",
        parameterClassIds: [],
        localizations: names({ color: { "en-US": "Colour", de: "Farbe" } }),
      },
    ]);

    expect(
      localizeCategory(catalog.localizations, "color", "en-US").value,
    ).toBe("Color");
    // A locale the first library said nothing about is still filled in.
    expect(localizeCategory(catalog.localizations, "color", "de").value).toBe(
      "Farbe",
    );
  });

  it("does not write the merged names back into a library's own table", () => {
    const first = names({ color: { "en-US": "Color" } });

    buildCategoryCatalog([
      {
        libraryId: "org.esta.lib.intensity-color",
        parameterClassIds: [],
        localizations: first,
      },
      {
        libraryId: "org.esta.lib.effect",
        parameterClassIds: [],
        localizations: names({ color: { de: "Farbe" } }),
      },
    ]);

    expect(first["color"].strings).toEqual({ "en-US": "Color" });
  });

  it("orders the categories so parents come before their children", () => {
    const catalog = buildCategoryCatalog([
      {
        libraryId: "org.esta.lib.intensity-color",
        parameterClassIds: [
          "color/subtractive/filter",
          "intensity/dimmer",
          "color/additive/emitter",
        ],
      },
    ]);

    expect(catalog.categories.map((category) => category.id)).toEqual([
      "color",
      "color/additive",
      "color/subtractive",
      "intensity",
    ]);
  });
});

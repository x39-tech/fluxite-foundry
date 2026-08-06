import { describe, test, expect } from "vitest";
import {
  ianaMediaTypes,
  isRegisteredMediaType,
  mediaTypeGroups,
  registeredMediaType,
  searchMediaTypes,
  topLevelTypeOf,
} from "./mediaTypes";

describe("isRegisteredMediaType", () => {
  test("accepts a type the registry lists", () => {
    expect(isRegisteredMediaType("image/png")).toBe(true);
    expect(isRegisteredMediaType("model/gltf-binary")).toBe(true);
  });

  test("rejects a plausible type the registry does not list", () => {
    // The registered spelling is image/jpeg
    expect(isRegisteredMediaType("image/jpg")).toBe(false);
    expect(isRegisteredMediaType("application/vnd.acme.made-up")).toBe(false);
  });

  test("ignores case and surrounding whitespace", () => {
    expect(isRegisteredMediaType("  IMAGE/PNG  ")).toBe(true);
  });

  test("rejects anything that is not a bare type and subtype", () => {
    expect(isRegisteredMediaType("image/png; charset=utf-8")).toBe(false);
    expect(isRegisteredMediaType("image")).toBe(false);
    expect(isRegisteredMediaType("")).toBe(false);
  });
});

describe("registeredMediaType", () => {
  test("gives back the registry's own spelling", () => {
    expect(registeredMediaType("IMAGE/PNG")).toBe("image/png");
  });

  test("gives back nothing for an unregistered type", () => {
    expect(registeredMediaType("image/jpg")).toBeUndefined();
  });
});

describe("topLevelTypeOf", () => {
  test("takes the part before the slash", () => {
    expect(topLevelTypeOf("image/svg+xml")).toBe("image");
  });

  test("takes the whole string when there is no slash", () => {
    expect(topLevelTypeOf("image")).toBe("image");
  });
});

describe("searchMediaTypes", () => {
  test("offers whole-string prefixes first, in registry order", () => {
    const results = searchMediaTypes("image/", 10);
    expect(results[0]).toBe("image/aces");
    expect(results.every((result) => result.startsWith("image/"))).toBe(true);
  });

  test("offers a subtype prefix ahead of a match inside the subtype", () => {
    // application/json should come before any alphabetically earlier types that
    // end in "+json".
    expect(searchMediaTypes("json", 10)[0]).toBe("application/json");
  });

  test("offers a subtype prefix ahead of a match in the middle", () => {
    const results = searchMediaTypes("png", 10);
    expect(results[0]).toBe("image/png");
    expect(results.indexOf("image/png")).toBeLessThan(
      results.indexOf("image/vnd.mozilla.apng"),
    );
  });

  test("ignores case", () => {
    expect(searchMediaTypes("PNG", 10)).toContain("image/png");
  });

  test("caps the result at the limit", () => {
    expect(searchMediaTypes("application", 5)).toHaveLength(5);
  });

  test("returns nothing when nothing matches", () => {
    expect(searchMediaTypes("no-such-media-type", 10)).toEqual([]);
  });

  test("browses the registry when the search is empty", () => {
    expect(searchMediaTypes("   ", 3)).toEqual(ianaMediaTypes.slice(0, 3));
  });
});

describe("mediaTypeGroups", () => {
  const groups = mediaTypeGroups(5);

  test("covers every top-level type exactly once", () => {
    const topLevelTypes = groups.map((group) => group.topLevelType);
    expect(topLevelTypes).toEqual([
      "application",
      "audio",
      "font",
      "haptics",
      "image",
      "message",
      "model",
      "multipart",
      "text",
      "video",
    ]);
  });

  test("caps each group but still reports its true size", () => {
    const application = groups.find(
      (group) => group.topLevelType === "application",
    )!;

    expect(application.mediaTypes).toHaveLength(5);
    expect(application.total).toBeGreaterThan(5);
    expect(
      application.mediaTypes.every((mediaType) =>
        mediaType.startsWith("application/"),
      ),
    ).toBe(true);
  });

  test("accounts for the whole registry across its groups", () => {
    const total = groups.reduce((sum, group) => sum + group.total, 0);
    expect(total).toBe(ianaMediaTypes.length);
  });
});

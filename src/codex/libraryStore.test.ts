import { describe, it, expect } from "vitest";
import { Library as FCLibrary } from "@cpwg-community/delver";
import {
  getEmptyLibraryStore,
  getNewestVersionOfEachLibrary,
  libraryStoreIsEmpty,
} from "./libraryStore";
import { LibraryStore, normalizeLibrary } from "./library";

function createMockLibrary(description = "Test library"): FCLibrary {
  return {
    "@description": description,
    publishDate: "2024-01-01",
    author: "Test Author",
    localizations: {},
  };
}

function createStore(libraryId: string, versions: string[]): LibraryStore {
  return {
    [libraryId]: Object.fromEntries(
      versions.map((v) => [
        v,
        normalizeLibrary(libraryId, v, createMockLibrary()),
      ]),
    ),
  };
}

describe("libraryStoreIsEmpty", () => {
  it("should be true for a store with no libraries", () => {
    expect(libraryStoreIsEmpty(getEmptyLibraryStore())).toBe(true);
  });

  it("should be false once a library is loaded", () => {
    expect(
      libraryStoreIsEmpty(createStore("org.esta.lib.core", ["1.0.0"])),
    ).toBe(false);
  });
});

describe("getNewestVersionOfEachLibrary", () => {
  it("should return empty array for empty store", () => {
    const result = getNewestVersionOfEachLibrary(getEmptyLibraryStore());
    expect(result).toEqual([]);
  });

  it("should return a single library with its only version", () => {
    const result = getNewestVersionOfEachLibrary(
      createStore("org.esta.lib.core", ["1.0.0"]),
    );

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("org.esta.lib.core");
    expect(result[0].version).toBe("1.0.0");
  });

  it("should return the newest version of a single library with multiple versions", () => {
    const result = getNewestVersionOfEachLibrary(
      createStore("org.esta.lib.core", ["1.0.0", "2.0.0"]),
    );

    expect(result).toHaveLength(1);
    expect(result[0].version).toBe("2.0.0");
  });

  it("should correctly sort semantic versions (major)", () => {
    const result = getNewestVersionOfEachLibrary(
      createStore("org.esta.lib.core", ["10.0.0", "2.0.0"]),
    );

    expect(result[0].version).toBe("10.0.0");
  });

  it("should correctly sort semantic versions (minor)", () => {
    const result = getNewestVersionOfEachLibrary(
      createStore("org.esta.lib.core", ["1.10.0", "1.2.0"]),
    );

    expect(result[0].version).toBe("1.10.0");
  });

  it("should correctly sort semantic versions (patch)", () => {
    const result = getNewestVersionOfEachLibrary(
      createStore("org.esta.lib.core", ["1.0.10", "1.0.2"]),
    );

    expect(result[0].version).toBe("1.0.10");
  });

  it("should handle multiple libraries with multiple versions each", () => {
    const store: LibraryStore = {
      ...createStore("org.esta.lib.core", ["1.0.0", "1.5.0", "2.0.0"]),
      ...createStore("org.esta.lib.intensity-color", ["1.0.0", "1.1.0"]),
    };

    const result = getNewestVersionOfEachLibrary(store);
    expect(result).toHaveLength(2);

    const coreResult = result.find((lib) => lib.id === "org.esta.lib.core");
    expect(coreResult?.version).toBe("2.0.0");

    const intensityColorResult = result.find(
      (lib) => lib.id === "org.esta.lib.intensity-color",
    );
    expect(intensityColorResult?.version).toBe("1.1.0");
  });

  it("should handle complex version sorting scenarios", () => {
    const result = getNewestVersionOfEachLibrary(
      createStore("org.example.lib.test", [
        "1.2.3",
        "1.10.5",
        "2.0.0",
        "1.9.99",
        "2.1.0",
        "10.0.0",
      ]),
    );

    expect(result[0].version).toBe("10.0.0");
  });
});

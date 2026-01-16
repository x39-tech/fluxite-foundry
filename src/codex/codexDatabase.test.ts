import { describe, it, expect } from "vitest";
import {
  getEmptyCodexDatabase,
  getNewestVersionOfEachLibrary,
  CodexDatabase,
} from "./codexDatabase";
import { Library } from "@cpwg-community/delver";

function createMockLibrary(description = "Test library"): Library {
  return {
    "@description": description,
    publishDate: "2024-01-01",
    author: "Test Author",
    localizations: {},
  };
}

function createDatabase(libraryId: string, versions: string[]): CodexDatabase {
  const lib = createMockLibrary();
  return {
    libraries: {
      [libraryId]: Object.fromEntries(versions.map((v) => [v, lib])),
    },
  };
}

describe("getNewestVersionOfEachLibrary", () => {
  it("should return empty array for empty database", () => {
    const result = getNewestVersionOfEachLibrary(getEmptyCodexDatabase());
    expect(result).toEqual([]);
  });

  it("should return a single library with its only version", () => {
    const database = createDatabase("org.esta.lib.core", ["1.0.0"]);
    const result = getNewestVersionOfEachLibrary(database);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("org.esta.lib.core");
    expect(result[0].version).toBe("1.0.0");
  });

  it("should return the newest version of a single library with multiple versions", () => {
    const database = createDatabase("org.esta.lib.core", ["1.0.0", "2.0.0"]);
    const result = getNewestVersionOfEachLibrary(database);

    expect(result).toHaveLength(1);
    expect(result[0].version).toBe("2.0.0");
  });

  it("should correctly sort semantic versions (major)", () => {
    const database = createDatabase("org.esta.lib.core", ["10.0.0", "2.0.0"]);
    const result = getNewestVersionOfEachLibrary(database);

    expect(result[0].version).toBe("10.0.0");
  });

  it("should correctly sort semantic versions (minor)", () => {
    const database = createDatabase("org.esta.lib.core", ["1.10.0", "1.2.0"]);
    const result = getNewestVersionOfEachLibrary(database);

    expect(result[0].version).toBe("1.10.0");
  });

  it("should correctly sort semantic versions (patch)", () => {
    const database = createDatabase("org.esta.lib.core", ["1.0.10", "1.0.2"]);
    const result = getNewestVersionOfEachLibrary(database);

    expect(result[0].version).toBe("1.0.10");
  });

  it("should handle multiple libraries with multiple versions each", () => {
    const database: CodexDatabase = {
      libraries: {
        "org.esta.lib.core": Object.fromEntries(
          ["1.0.0", "1.5.0", "2.0.0"].map((v) => [v, createMockLibrary()]),
        ),
        "org.esta.lib.intensity-color": Object.fromEntries(
          ["1.0.0", "1.1.0"].map((v) => [v, createMockLibrary()]),
        ),
      },
    };

    const result = getNewestVersionOfEachLibrary(database);
    expect(result).toHaveLength(2);

    const coreResult = result.find((lib) => lib.id === "org.esta.lib.core");
    expect(coreResult?.version).toBe("2.0.0");

    const intensityColorResult = result.find(
      (lib) => lib.id === "org.esta.lib.intensity-color",
    );
    expect(intensityColorResult?.version).toBe("1.1.0");
  });

  it("should handle complex version sorting scenarios", () => {
    const database = createDatabase("org.example.lib.test", [
      "1.2.3",
      "1.10.5",
      "2.0.0",
      "1.9.99",
      "2.1.0",
      "10.0.0",
    ]);

    const result = getNewestVersionOfEachLibrary(database);
    expect(result[0].version).toBe("10.0.0");
  });
});

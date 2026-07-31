import { describe, it, expect } from "vitest";
import { collectLocalizableKeys, localize } from "./localizationUtils";
import {
  Localization,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";

describe("collectLocalizableKeys", () => {
  describe("basic functionality", () => {
    it("should return an empty set for null", () => {
      const result = collectLocalizableKeys(null);
      expect(result).toEqual(new Set());
    });

    it("should return an empty set for undefined", () => {
      const result = collectLocalizableKeys(undefined);
      expect(result).toEqual(new Set());
    });

    it("should return an empty set for primitives", () => {
      expect(collectLocalizableKeys("string")).toEqual(new Set());
      expect(collectLocalizableKeys(123)).toEqual(new Set());
      expect(collectLocalizableKeys(true)).toEqual(new Set());
    });

    it("should return an empty set for empty object", () => {
      const result = collectLocalizableKeys({});
      expect(result).toEqual(new Set());
    });

    it("should return an empty set for empty array", () => {
      const result = collectLocalizableKeys([]);
      expect(result).toEqual(new Set());
    });
  });

  describe("simple objects with @ keys", () => {
    it("should collect a single @ key", () => {
      const obj = { "@name": "loc_key_1" };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["loc_key_1"]));
    });

    it("should collect multiple @ keys", () => {
      const obj = {
        "@name": "loc_key_1",
        "@description": "loc_key_2",
        "@friendlyName": "loc_key_3",
      };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["loc_key_1", "loc_key_2", "loc_key_3"]));
    });

    it("should ignore @ keys with non-string values", () => {
      const obj = {
        "@name": "loc_key_1",
        "@count": 123,
        "@enabled": true,
        "@data": { nested: "value" },
      };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["loc_key_1"]));
    });

    it("should ignore keys that don't start with @", () => {
      const obj = {
        "@name": "loc_key_1",
        name: "not_a_loc_key",
        description: "also_not_a_loc_key",
      };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["loc_key_1"]));
    });
  });

  describe("nested objects", () => {
    it("should collect keys from nested objects", () => {
      const obj = {
        "@name": "loc_key_1",
        nested: {
          "@description": "loc_key_2",
        },
      };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["loc_key_1", "loc_key_2"]));
    });

    it("should collect keys from deeply nested objects", () => {
      const obj = {
        "@name": "loc_key_1",
        level1: {
          "@title": "loc_key_2",
          level2: {
            "@subtitle": "loc_key_3",
            level3: {
              "@label": "loc_key_4",
            },
          },
        },
      };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(
        new Set(["loc_key_1", "loc_key_2", "loc_key_3", "loc_key_4"]),
      );
    });
  });

  describe("arrays", () => {
    it("should collect keys from array items", () => {
      const obj = [{ "@name": "loc_key_1" }, { "@name": "loc_key_2" }];
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["loc_key_1", "loc_key_2"]));
    });

    it("should collect keys from nested arrays", () => {
      const obj = {
        items: [
          { "@name": "loc_key_1" },
          { "@name": "loc_key_2", nested: [{ "@title": "loc_key_3" }] },
        ],
      };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["loc_key_1", "loc_key_2", "loc_key_3"]));
    });
  });

  describe("Command-like structures", () => {
    it("should collect keys from a Command object", () => {
      const command = {
        library: "some.library",
        class: "CommandClass",
        "@friendlyName": "command_friendly_name",
        completionNotification: true,
      };
      const result = collectLocalizableKeys(command);
      expect(result).toEqual(new Set(["command_friendly_name"]));
    });

    it("should collect keys from argumentChoices", () => {
      const command = {
        "@friendlyName": "command_name",
        argumentChoices: {
          arg1: {
            excluded: ["choice1"],
            additional: [
              { id: "choice2", "@name": "arg1_choice2_name" },
              { id: "choice3", "@name": "arg1_choice3_name" },
            ],
          },
          arg2: {
            additional: [{ id: "choice1", "@name": "arg2_choice1_name" }],
          },
        },
      };
      const result = collectLocalizableKeys(command);
      expect(result).toEqual(
        new Set([
          "command_name",
          "arg1_choice2_name",
          "arg1_choice3_name",
          "arg2_choice1_name",
        ]),
      );
    });

    it("should collect keys from returnChoices", () => {
      const command = {
        "@friendlyName": "command_name",
        returnChoices: {
          return1: {
            additional: [
              { id: "value1", "@name": "return1_value1_name" },
              { id: "value2", "@name": "return1_value2_name" },
            ],
          },
        },
      };
      const result = collectLocalizableKeys(command);
      expect(result).toEqual(
        new Set(["command_name", "return1_value1_name", "return1_value2_name"]),
      );
    });

    it("should collect keys from both argumentChoices and returnChoices", () => {
      const command = {
        "@friendlyName": "command_name",
        argumentChoices: {
          arg1: {
            additional: [{ id: "choice1", "@name": "arg_choice_name" }],
          },
        },
        returnChoices: {
          ret1: {
            additional: [{ id: "value1", "@name": "ret_value_name" }],
          },
        },
      };
      const result = collectLocalizableKeys(command);
      expect(result).toEqual(
        new Set(["command_name", "arg_choice_name", "ret_value_name"]),
      );
    });
  });

  describe("accumulator parameter", () => {
    it("should add to an existing Set when accumulator is provided", () => {
      const existing = new Set(["existing_key_1", "existing_key_2"]);
      const obj = { "@name": "new_key" };
      const result = collectLocalizableKeys(obj, existing);
      expect(result).toBe(existing); // Same Set instance
      expect(result).toEqual(
        new Set(["existing_key_1", "existing_key_2", "new_key"]),
      );
    });

    it("should create a new Set when accumulator is not provided", () => {
      const obj = { "@name": "new_key" };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["new_key"]));
    });

    it("should handle duplicate keys", () => {
      const obj1 = { "@name": "shared_key" };
      const obj2 = { "@name": "shared_key", "@title": "unique_key" };
      const accumulator = new Set<string>();
      collectLocalizableKeys(obj1, accumulator);
      collectLocalizableKeys(obj2, accumulator);
      expect(accumulator).toEqual(new Set(["shared_key", "unique_key"]));
    });
  });

  describe("edge cases", () => {
    it("should handle objects with @ keys that have empty string values", () => {
      const obj = { "@name": "" };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set([""]));
    });

    it("should handle mixed content", () => {
      const obj = {
        "@name": "loc_key_1",
        regularKey: "not_collected",
        numberKey: 42,
        boolKey: false,
        nested: {
          "@description": "loc_key_2",
          array: [
            "primitive",
            { "@title": "loc_key_3" },
            { regularKey: "ignored" },
          ],
        },
      };
      const result = collectLocalizableKeys(obj);
      expect(result).toEqual(new Set(["loc_key_1", "loc_key_2", "loc_key_3"]));
    });

    it("should not handle circular references (documented limitation)", () => {
      // Note: Circular references will cause a stack overflow in the current implementation.
      // This is acceptable because our application state is JSON-serializable (enforced by
      // AppPersistentState type), which means circular references cannot exist in practice.
      const obj: { "@name": string; self?: object } = { "@name": "loc_key_1" };
      obj.self = obj; // Create circular reference
      expect(() => collectLocalizableKeys(obj)).toThrow(RangeError);
    });
  });
});

describe("localize", () => {
  describe("basic functionality", () => {
    it("should return the value for the desired locale", () => {
      const db: Record<LocalizationKey, Localization> = {
        [LocalizationKey("loc_key_1")]: {
          strings: LocalizationDbSchema.parse({
            "en-US": "Hello",
            "fr-FR": "Bonjour",
          }),
          items: [],
        },
      };
      const result = localize(db, LocalizationKey("loc_key_1"), "en-US");
      expect(result).toEqual({
        value: "Hello",
        locale: "en-US",
        desiredLocale: "en-US",
      });
    });

    it("should fall back to en-US when desired locale is not available", () => {
      const db: Record<LocalizationKey, Localization> = {
        [LocalizationKey("loc_key_1")]: {
          strings: LocalizationDbSchema.parse({
            "en-US": "Hello",
            "fr-FR": "Bonjour",
          }),
          items: [],
        },
      };
      const result = localize(db, LocalizationKey("loc_key_1"), "de-DE");
      expect(result).toEqual({
        value: "Hello",
        locale: "en-US",
        desiredLocale: "de-DE",
      });
    });

    it("should return the key when no strings are available", () => {
      const db: Record<LocalizationKey, Localization> = {
        [LocalizationKey("loc_key_1")]: {
          strings: LocalizationDbSchema.parse({}),
          items: [],
        },
      };
      const result = localize(db, LocalizationKey("loc_key_1"), "en-US");
      expect(result).toEqual({
        value: "loc_key_1",
        desiredLocale: "en-US",
      });
    });

    it("should return the key when the key is not in the database", () => {
      const db: Record<LocalizationKey, Localization> = {};
      const result = localize(db, LocalizationKey("missing_key"), "en-US");
      expect(result).toEqual({
        value: "missing_key",
        desiredLocale: "en-US",
      });
    });
  });

  describe("empty string handling", () => {
    it("should return empty string when desired locale has empty string", () => {
      const db: Record<LocalizationKey, Localization> = {
        [LocalizationKey("loc_key_1")]: {
          strings: LocalizationDbSchema.parse({ "en-US": "" }),
          items: [],
        },
      };
      const result = localize(db, LocalizationKey("loc_key_1"), "en-US");
      expect(result).toEqual({
        value: "",
        locale: "en-US",
        desiredLocale: "en-US",
      });
    });

    it("should return empty string when fallback locale has empty string", () => {
      const db: Record<LocalizationKey, Localization> = {
        [LocalizationKey("loc_key_1")]: {
          strings: LocalizationDbSchema.parse({ "en-US": "" }),
          items: [],
        },
      };
      const result = localize(db, LocalizationKey("loc_key_1"), "fr-FR");
      expect(result).toEqual({
        value: "",
        locale: "en-US",
        desiredLocale: "fr-FR",
      });
    });

    it("should prefer desired locale empty string over non-empty fallback", () => {
      const db: Record<LocalizationKey, Localization> = {
        [LocalizationKey("loc_key_1")]: {
          strings: LocalizationDbSchema.parse({
            "en-US": "Hello",
            "fr-FR": "",
          }),
          items: [],
        },
      };
      const result = localize(db, LocalizationKey("loc_key_1"), "fr-FR");
      expect(result).toEqual({
        value: "",
        locale: "fr-FR",
        desiredLocale: "fr-FR",
      });
    });
  });

  describe("edge cases", () => {
    it("should handle undefined database", () => {
      const result = localize(
        undefined as unknown as Record<LocalizationKey, Localization>,
        LocalizationKey("loc_key_1"),
        "en-US",
      );
      expect(result).toEqual({
        value: "loc_key_1",
        desiredLocale: "en-US",
      });
    });

    it("should handle database with undefined strings", () => {
      const db = {
        [LocalizationKey("loc_key_1")]: {
          strings: undefined,
          items: [],
        },
      } as unknown as Record<LocalizationKey, Localization>;
      const result = localize(db, LocalizationKey("loc_key_1"), "en-US");
      expect(result).toEqual({
        value: "loc_key_1",
        desiredLocale: "en-US",
      });
    });
  });
});

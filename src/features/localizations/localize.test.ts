import { describe, it, expect } from "vitest";
import { localize } from "./localize";
import {
  Localization,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";

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

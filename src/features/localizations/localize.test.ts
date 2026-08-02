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
        },
      };
      const result = localize(db, LocalizationKey("loc_key_1"), "en-US");
      expect(result).toEqual({
        value: "Hello",
        locale: "en-US",
        desiredLocale: "en-US",
      });
    });

    it("should fall back to a locale the string does have", () => {
      const db: Record<LocalizationKey, Localization> = {
        [LocalizationKey("loc_key_1")]: {
          strings: LocalizationDbSchema.parse({
            "en-US": "Hello",
            "fr-FR": "Bonjour",
          }),
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

  describe("the fallback chain", () => {
    const entry = (strings: Record<string, string>) => ({
      [LocalizationKey("k")]: {
        strings: LocalizationDbSchema.parse(strings),
      },
    });

    it("prefers another locale of the same language over the source locale", () => {
      const result = localize(
        entry({ "de-AT": "Servus", "en-US": "Hello" }),
        LocalizationKey("k"),
        "de-DE",
        "en-US",
      );

      expect(result.value).toBe("Servus");
      expect(result.locale).toBe("de-AT");
    });

    it("prefers the bare language tag over a regional one", () => {
      const result = localize(
        entry({ de: "Hallo", "de-AT": "Servus" }),
        LocalizationKey("k"),
        "de-DE",
      );

      expect(result.locale).toBe("de");
    });

    it("falls back to the source locale when the language does not match", () => {
      const result = localize(
        entry({ "en-US": "Hello", "ja-JP": "Konnichiwa" }),
        LocalizationKey("k"),
        "de-DE",
        "ja-JP",
      );

      expect(result.value).toBe("Konnichiwa");
      expect(result.locale).toBe("ja-JP");
    });

    it("falls back to the source locale's language", () => {
      const result = localize(
        entry({ "en-US": "Hello", ja: "Konnichiwa" }),
        LocalizationKey("k"),
        "de-DE",
        "ja-JP",
      );

      expect(result.locale).toBe("ja");
    });

    it("reports the locale it settled on, so a caller can tell it is not the desired one", () => {
      const result = localize(
        entry({ "en-US": "Hello" }),
        LocalizationKey("k"),
        "de-DE",
        "en-US",
      );

      expect(result.locale).not.toBe(result.desiredLocale);
    });

    it("picks the same locale every time when only unrelated ones are available", () => {
      const strings = entry({ "fr-FR": "Bonjour", "ja-JP": "Konnichiwa" });

      expect(localize(strings, LocalizationKey("k"), "de-DE").locale).toBe(
        localize(strings, LocalizationKey("k"), "de-DE").locale,
      );
    });
  });

  describe("empty string handling", () => {
    it("should return empty string when desired locale has empty string", () => {
      const db: Record<LocalizationKey, Localization> = {
        [LocalizationKey("loc_key_1")]: {
          strings: LocalizationDbSchema.parse({ "en-US": "" }),
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

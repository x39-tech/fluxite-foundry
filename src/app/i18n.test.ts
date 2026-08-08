import { describe, it, expect } from "vitest";
import { resolveUiLocale } from "./i18n";

describe("resolveUiLocale", () => {
  it("keeps a locale the interface is available in", () => {
    expect(resolveUiLocale("en")).toBe("en");
    expect(resolveUiLocale("pseudo-LOCALE")).toBe("pseudo-LOCALE");
  });

  it("falls back to the language when the region is not on offer", () => {
    expect(resolveUiLocale("en-GB")).toBe("en");
    expect(resolveUiLocale("en-AU")).toBe("en");
  });

  it("falls back to the default for a language with no interface", () => {
    expect(resolveUiLocale("de-DE")).toBe("en");
    expect(resolveUiLocale("ja")).toBe("en");
  });

  it("falls back to the default for a locale it cannot make sense of", () => {
    expect(resolveUiLocale("")).toBe("en");
    expect(resolveUiLocale("not a locale")).toBe("en");
  });
});

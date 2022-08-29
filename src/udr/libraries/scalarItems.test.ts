import { getScalarItemClass } from "./scalarItems";

describe("getScalarItemClass function", () => {
  it("returns an existing scalar item class successfully", () => {
    const itemClass = getScalarItemClass(
      "org.esta.lib.intensity-color.1/intensity/dimmer"
    );
    expect(itemClass).toBeTruthy();
    expect(itemClass!.identifier).toBe("dimmer");
  });

  it("returns an existing scalar item class with a category containing slashes", () => {
    const itemClass = getScalarItemClass(
      "org.esta.lib.gobo.1/gobo/select/index"
    );
    expect(itemClass).toBeTruthy();
    expect(itemClass!.identifier).toBe("index");
  });

  it("returns undefined when a scalar item ID doesn't exist within a valid category", () => {
    expect(
      getScalarItemClass("org.esta.lib.intensity-color.1/intensity/foo")
    ).toBe(undefined);
  });

  it("returns undefined when the scalar item identifier is missing", () => {
    expect(getScalarItemClass("org.esta.lib.intensity-color.1/intensity")).toBe(
      undefined
    );
  });

  it("returns undefined when the category identifier is missing", () => {
    expect(getScalarItemClass("org.esta.lib.intensity-color.1")).toBe(
      undefined
    );
  });

  it("returns undefined when given an arbitrary string", () => {
    expect(getScalarItemClass("foo")).toBe(undefined);
  });
});

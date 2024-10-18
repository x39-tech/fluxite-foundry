import { E173Document, importUdr, validateUdr } from "e173";

test("Validation throws on error", () => {
  try {
    const udr = importUdr('{"e173doc": {}, "$schema": ""}');
    console.log(udr);
    expect(udr.$schema).toBe("");
    validateUdr({ e173doc: {}, $schema: "" } as E173Document);
  } catch (err) {
    expect(JSON.stringify(err)).toBe("foo");
  }
});

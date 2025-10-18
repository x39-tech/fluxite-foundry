import { test, expect } from "vitest";
import { ParameterSchema, CodexId, EntityId } from "./state";

test("catches an invalid count", () => {
  const res = ParameterSchema.parse({
    codexId: CodexId("test-param"),
    class: { type: "local", codexId: CodexId("foo"), id: EntityId("123") },
    access: ["readTarget"],
    lifetime: "runtime",
    count: 0.5,
    localized: {},
  });
  expect(res.count).toBeUndefined();
  expect(res.codexId).toBe("test-param");
});

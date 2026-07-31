import { describe, expect, it } from "vitest";
import * as z from "zod";
import { VERSION } from "./persistentState";
import {
  assertChainIsContiguous,
  CHAIN_END_VERSION,
  getMigration,
  getSchemaForVersion,
  Migration,
  MIGRATIONS,
} from "./persistentStateMigrations";

function fakeMigration(fromVersion: number, toVersion: number): Migration {
  return {
    fromVersion,
    toVersion,
    fromSchema: z.unknown(),
    toSchema: z.unknown(),
    migrate: (state) => state,
    description: "",
  };
}

describe("the migration chain", () => {
  it("ends at the version the app loads state as", () => {
    expect(CHAIN_END_VERSION).toBe(VERSION);
  });

  it("has a migration out of every version except the current one", () => {
    for (let version = 1; version < VERSION; version++) {
      expect(getMigration(version)?.toVersion).toBe(version + 1);
    }
    expect(getMigration(VERSION)).toBeUndefined();
  });

  it("knows the schema for every version", () => {
    for (let version = 1; version <= VERSION; version++) {
      expect(getSchemaForVersion(version)).toBeDefined();
    }
    expect(getSchemaForVersion(VERSION + 1)).toBeUndefined();
  });

  it("is contiguous", () => {
    expect(() => assertChainIsContiguous(MIGRATIONS)).not.toThrow();
  });
});

describe("assertChainIsContiguous", () => {
  it("rejects a chain with a gap in it", () => {
    const chain = [fakeMigration(1, 2), fakeMigration(3, 4)];

    expect(() => assertChainIsContiguous(chain)).toThrow(
      "expected v2 to v3 at index 1",
    );
  });

  it("rejects a chain that does not start at v1", () => {
    const chain = [fakeMigration(2, 3)];

    expect(() => assertChainIsContiguous(chain)).toThrow(
      "expected v1 to v2 at index 0",
    );
  });
});

import { describe, it, expect } from "vitest";
import { parseQualifiedId, buildQualifiedId, EntityType } from "./utils";

describe("parseQualifiedId", () => {
  describe("valid qualified IDs with organization IDs", () => {
    it("should parse a library qualified ID", () => {
      const result = parseQualifiedId("org.esta.lib.intensity-color");
      expect(result).toEqual([
        EntityType.Lib,
        { type: "org", id: "org.esta" },
        "intensity-color",
      ]);
    });

    it("should parse a device class qualified ID", () => {
      const result = parseQualifiedId("org.example.dev.my-device");
      expect(result).toEqual([
        EntityType.Dev,
        { type: "org", id: "org.example" },
        "my-device",
      ]);
    });

    it("should parse a system qualified ID", () => {
      const result = parseQualifiedId("com.company.sys.control-system");
      expect(result).toEqual([
        EntityType.Sys,
        { type: "org", id: "com.company" },
        "control-system",
      ]);
    });

    it("should handle identifiers with dots", () => {
      const result = parseQualifiedId("org.esta.lib.some.complex.identifier");
      expect(result).toEqual([
        EntityType.Lib,
        { type: "org", id: "org.esta" },
        "some.complex.identifier",
      ]);
    });

    it("should handle complex organization IDs", () => {
      const result = parseQualifiedId("com.example.subdomain.lib.my-lib");
      expect(result).toEqual([
        EntityType.Lib,
        { type: "org", id: "com.example.subdomain" },
        "my-lib",
      ]);
    });
  });

  describe("valid qualified IDs with user IDs", () => {
    it("should parse a user device class qualified ID", () => {
      const result = parseQualifiedId(
        "org.esta.e173.user.fa75d45c-b671-46af-b2c2-2c5cc0d7b793.dev.my-device",
      );
      expect(result).toEqual([
        EntityType.Dev,
        { type: "user", id: "fa75d45c-b671-46af-b2c2-2c5cc0d7b793" },
        "my-device",
      ]);
    });

    it("should parse a user system qualified ID", () => {
      const result = parseQualifiedId(
        "org.esta.e173.user.12345678-1234-5678-1234-567812345678.sys.my-system",
      );
      expect(result).toEqual([
        EntityType.Sys,
        { type: "user", id: "12345678-1234-5678-1234-567812345678" },
        "my-system",
      ]);
    });

    it("should parse a user library qualified ID", () => {
      const result = parseQualifiedId(
        "org.esta.e173.user.abcdef12-3456-7890-abcd-ef1234567890.lib.custom-lib",
      );
      expect(result).toEqual([
        EntityType.Lib,
        { type: "user", id: "abcdef12-3456-7890-abcd-ef1234567890" },
        "custom-lib",
      ]);
    });

    it("should handle user IDs with identifiers containing dots", () => {
      const result = parseQualifiedId(
        "org.esta.e173.user.fa75d45c-b671-46af-b2c2-2c5cc0d7b793.dev.some.complex.id",
      );
      expect(result).toEqual([
        EntityType.Dev,
        { type: "user", id: "fa75d45c-b671-46af-b2c2-2c5cc0d7b793" },
        "some.complex.id",
      ]);
    });
  });

  describe("invalid qualified IDs", () => {
    it("should return null for strings without entity type", () => {
      expect(parseQualifiedId("org.esta.something")).toBeNull();
    });

    it("should return null for strings that are too short", () => {
      expect(parseQualifiedId("org.lib")).toBeNull();
      expect(parseQualifiedId("lib")).toBeNull();
      expect(parseQualifiedId("")).toBeNull();
    });

    it("should return null for strings without identifier", () => {
      expect(parseQualifiedId("org.esta.lib")).toBeNull();
    });

    it("should return null for strings with invalid entity type", () => {
      expect(parseQualifiedId("org.esta.invalid.my-thing")).toBeNull();
    });

    it("should return null for malformed user IDs", () => {
      // User ID missing UUID
      expect(parseQualifiedId("org.esta.e173.user.dev.my-device")).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle the first occurrence of entity type", () => {
      // If 'lib' appears multiple times, use the first one
      const result = parseQualifiedId("org.esta.lib.my-lib-lib");
      expect(result).toEqual([
        EntityType.Lib,
        { type: "org", id: "org.esta" },
        "my-lib-lib",
      ]);
    });

    it("should handle entity type in organization name", () => {
      // Entity type 'lib' in org name shouldn't confuse parser
      const result = parseQualifiedId("org.library.dev.my-device");
      expect(result).toEqual([
        EntityType.Dev,
        { type: "org", id: "org.library" },
        "my-device",
      ]);
    });
  });
});

describe("buildQualifiedId", () => {
  describe("building qualified IDs with organization IDs", () => {
    it("should build a library qualified ID", () => {
      const result = buildQualifiedId(
        EntityType.Lib,
        { type: "org", id: "org.esta" },
        "intensity-color",
      );
      expect(result).toBe("org.esta.lib.intensity-color");
    });

    it("should build a device class qualified ID", () => {
      const result = buildQualifiedId(
        EntityType.Dev,
        { type: "org", id: "org.example" },
        "my-device",
      );
      expect(result).toBe("org.example.dev.my-device");
    });

    it("should build a system qualified ID", () => {
      const result = buildQualifiedId(
        EntityType.Sys,
        { type: "org", id: "com.company" },
        "control-system",
      );
      expect(result).toBe("com.company.sys.control-system");
    });

    it("should handle identifiers with dots", () => {
      const result = buildQualifiedId(
        EntityType.Lib,
        { type: "org", id: "org.esta" },
        "some.complex.identifier",
      );
      expect(result).toBe("org.esta.lib.some.complex.identifier");
    });

    it("should handle complex organization IDs", () => {
      const result = buildQualifiedId(
        EntityType.Dev,
        { type: "org", id: "com.example.subdomain" },
        "my-device",
      );
      expect(result).toBe("com.example.subdomain.dev.my-device");
    });
  });

  describe("building qualified IDs with user IDs", () => {
    it("should build a user device class qualified ID", () => {
      const result = buildQualifiedId(
        EntityType.Dev,
        { type: "user", id: "fa75d45c-b671-46af-b2c2-2c5cc0d7b793" },
        "my-device",
      );
      expect(result).toBe(
        "org.esta.e173.user.fa75d45c-b671-46af-b2c2-2c5cc0d7b793.dev.my-device",
      );
    });

    it("should build a user system qualified ID", () => {
      const result = buildQualifiedId(
        EntityType.Sys,
        { type: "user", id: "12345678-1234-5678-1234-567812345678" },
        "my-system",
      );
      expect(result).toBe(
        "org.esta.e173.user.12345678-1234-5678-1234-567812345678.sys.my-system",
      );
    });

    it("should build a user library qualified ID", () => {
      const result = buildQualifiedId(
        EntityType.Lib,
        { type: "user", id: "abcdef12-3456-7890-abcd-ef1234567890" },
        "custom-lib",
      );
      expect(result).toBe(
        "org.esta.e173.user.abcdef12-3456-7890-abcd-ef1234567890.lib.custom-lib",
      );
    });

    it("should handle user IDs with identifiers containing dots", () => {
      const result = buildQualifiedId(
        EntityType.Dev,
        { type: "user", id: "fa75d45c-b671-46af-b2c2-2c5cc0d7b793" },
        "some.complex.id",
      );
      expect(result).toBe(
        "org.esta.e173.user.fa75d45c-b671-46af-b2c2-2c5cc0d7b793.dev.some.complex.id",
      );
    });
  });
});

describe("parseQualifiedId and buildQualifiedId round-trip", () => {
  it("should round-trip organization library IDs", () => {
    const original = "org.esta.lib.intensity-color";
    const parsed = parseQualifiedId(original);
    expect(parsed).not.toBeNull();
    const [idType, orgId, id] = parsed!;
    const rebuilt = buildQualifiedId(idType, orgId, id);
    expect(rebuilt).toBe(original);
  });

  it("should round-trip organization device IDs", () => {
    const original = "com.example.subdomain.dev.my-device";
    const parsed = parseQualifiedId(original);
    expect(parsed).not.toBeNull();
    const [idType, orgId, id] = parsed!;
    const rebuilt = buildQualifiedId(idType, orgId, id);
    expect(rebuilt).toBe(original);
  });

  it("should round-trip user device IDs", () => {
    const original =
      "org.esta.e173.user.fa75d45c-b671-46af-b2c2-2c5cc0d7b793.dev.my-device";
    const parsed = parseQualifiedId(original);
    expect(parsed).not.toBeNull();
    const [idType, orgId, id] = parsed!;
    const rebuilt = buildQualifiedId(idType, orgId, id);
    expect(rebuilt).toBe(original);
  });

  it("should round-trip user system IDs", () => {
    const original =
      "org.esta.e173.user.12345678-1234-5678-1234-567812345678.sys.control-system";
    const parsed = parseQualifiedId(original);
    expect(parsed).not.toBeNull();
    const [idType, orgId, id] = parsed!;
    const rebuilt = buildQualifiedId(idType, orgId, id);
    expect(rebuilt).toBe(original);
  });

  it("should round-trip IDs with complex identifiers", () => {
    const original = "org.esta.lib.some.complex.identifier.with.dots";
    const parsed = parseQualifiedId(original);
    expect(parsed).not.toBeNull();
    const [idType, orgId, id] = parsed!;
    const rebuilt = buildQualifiedId(idType, orgId, id);
    expect(rebuilt).toBe(original);
  });
});

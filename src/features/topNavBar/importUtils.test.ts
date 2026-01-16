import { describe, it, expect } from "vitest";
import { E173Document, DeviceClass } from "@cpwg-community/delver";
import {
  validateInputFile,
  getDeviceClassFromDocument,
  getDeviceClassFromArchive,
  FeedbackKind,
} from "./importUtils";
import { CODEX_ARCHIVE_SCHEMA_URL, CODEX_DOC_SCHEMA_URL } from "consts";

// Helper function to create a valid device class for testing
function createValidDeviceClass(
  description: string = "Test device",
  author: string = "Test Author",
): DeviceClass {
  return {
    "@description": description,
    author,
    publishDate: "2024-01-01",
    history: {},
    info: {
      manufacturer: {
        name: "Test Company",
      },
      model: {
        name: "Test Model",
        category: "lighting",
        subcategory: "moving-profile",
      },
    },
    libraries: {
      "org.esta.lib.core": "1.0.0",
    },
    parameters: {
      "test-param": {
        library: "org.esta.lib.core",
        class: "test/param",
        "@friendlyName": "Test Parameter",
        access: ["readActual", "write"],
        lifetime: "runtime",
        minimum: 0,
        maximum: 1,
      },
    },
  };
}

// Helper to create a complete E173Document with schema
function createE173Document(
  deviceClasses: E173Document["e173doc"]["deviceClasses"],
): E173Document {
  return {
    $schema: CODEX_DOC_SCHEMA_URL,
    e173doc: {
      deviceClasses,
    },
  };
}

describe("importUtils", () => {
  describe("validateInputFile", () => {
    it("should reject files with unsupported extensions", async () => {
      const file = new File(["content"], "test.txt", { type: "text/plain" });
      const result = await validateInputFile(file);

      expect(result.valid).toBe(false);
      expect(result.feedbackKind).toBe(FeedbackKind.ValidationFailed);
      expect(result.feedback).toBe(
        "Only Fluxite Codex Document or Archive files are supported",
      );
    });

    it("should handle .fcd files with valid device classes", async () => {
      const validCodexDoc = createE173Document({
        "org.esta.dev.my-device": {
          "1.0.0": createValidDeviceClass("Test device", "Test Author"),
        },
      });

      const file = new File([JSON.stringify(validCodexDoc)], "test.fcd", {
        type: "application/json",
      });
      const result = await validateInputFile(file);

      expect(result.valid).toBe(true);
      expect(result.deviceClasses).toHaveLength(1);
      expect(result.deviceClasses?.[0]).toEqual({
        orgId: { type: "org", id: "org.esta" },
        id: "my-device",
        version: "1.0.0",
        fileName: "test.fcd",
      });
    });

    it("should handle .fcd files with user ID device classes", async () => {
      const validCodexDoc = createE173Document({
        "org.esta.e173.user.12345678-1234-5678-1234-567812345678.dev.super-light":
          {
            "1.0.0": createValidDeviceClass("User device", "User"),
            "2.0.0": createValidDeviceClass("User device v2", "User"),
          },
      });

      const file = new File(
        [JSON.stringify(validCodexDoc)],
        "user-device.fcd",
        {
          type: "application/json",
        },
      );
      const result = await validateInputFile(file);

      expect(result.valid).toBe(true);
      expect(result.deviceClasses).toHaveLength(2);

      // Verify both versions exist without depending on order
      expect(result.deviceClasses).toContainEqual({
        orgId: {
          type: "user",
          id: "12345678-1234-5678-1234-567812345678",
        },
        id: "super-light",
        version: "1.0.0",
        fileName: "user-device.fcd",
      });
      expect(result.deviceClasses).toContainEqual({
        orgId: {
          type: "user",
          id: "12345678-1234-5678-1234-567812345678",
        },
        id: "super-light",
        version: "2.0.0",
        fileName: "user-device.fcd",
      });
    });

    it("should reject device classes with invalid qualified IDs", async () => {
      const invalidCodexDoc = createE173Document({
        "invalid-id-format": {
          "1.0.0": createValidDeviceClass("Invalid device", "Test"),
        },
      });

      const file = new File([JSON.stringify(invalidCodexDoc)], "test.fcd", {
        type: "application/json",
      });
      const result = await validateInputFile(file);

      expect(result.valid).toBe(false);
      expect(result.feedbackKind).toBe(FeedbackKind.ValidationFailed);
      expect(result.feedback).toContain("Qualified Identifier");
    });

    it("should reject non-device entity types in deviceClasses", async () => {
      const mixedCodexDoc = createE173Document({
        "org.esta.lib.some-library": {
          "1.0.0": createValidDeviceClass("Library", "Test"),
        },
      });

      const file = new File([JSON.stringify(mixedCodexDoc)], "mixed.fcd", {
        type: "application/json",
      });
      const result = await validateInputFile(file);

      expect(result.valid).toBe(false);
      expect(result.feedbackKind).toBe(FeedbackKind.ValidationFailed);
      expect(result.feedback).toContain("must have the component 'dev'");
    });

    it("should return validation error for malformed JSON", async () => {
      const file = new File(["{ invalid json }"], "invalid.fcd", {
        type: "application/json",
      });
      const result = await validateInputFile(file);

      expect(result.valid).toBe(false);
      expect(result.feedbackKind).toBe(FeedbackKind.ValidationFailed);
    });

    it("should handle empty device classes object", async () => {
      const emptyCodexDoc = createE173Document({});

      const file = new File([JSON.stringify(emptyCodexDoc)], "empty.fcd", {
        type: "application/json",
      });
      const result = await validateInputFile(file);

      expect(result.valid).toBe(true);
      expect(result.deviceClasses).toHaveLength(0);
    });

    it("should handle document with no device classes", async () => {
      const noDevicesCodexDoc: E173Document = {
        $schema: CODEX_DOC_SCHEMA_URL,
        e173doc: {},
      };

      const file = new File(
        [JSON.stringify(noDevicesCodexDoc)],
        "no-devices.fcd",
        {
          type: "application/json",
        },
      );
      const result = await validateInputFile(file);

      expect(result.valid).toBe(true);
      expect(result.deviceClasses).toHaveLength(0);
    });
  });

  describe("getDeviceClassFromDocument", () => {
    it("should retrieve device class with organization ID", async () => {
      const deviceClassDef = createValidDeviceClass(
        "Test device",
        "Test Author",
      );
      const codexDoc = createE173Document({
        "org.example.dev.test-device": {
          "1.0.0": deviceClassDef,
        },
      });

      const file = new File([JSON.stringify(codexDoc)], "test.fcd", {
        type: "application/json",
      });

      const deviceClass = await getDeviceClassFromDocument(file, {
        orgId: { type: "org", id: "org.example" },
        id: "test-device",
        version: "1.0.0",
        fileName: "test.fcd",
      });

      expect(deviceClass).not.toBeNull();
      expect(deviceClass?.["@description"]).toBe("Test device");
      expect(deviceClass?.author).toBe("Test Author");
    });

    it("should retrieve device class with user ID", async () => {
      const uuid = "12345678-1234-5678-1234-567812345678";
      const qualifiedId = `org.esta.e173.user.${uuid}.dev.my-device`;
      const deviceClassDef = createValidDeviceClass("User device", "User");

      const codexDoc = createE173Document({
        [qualifiedId]: {
          "2.0.0": deviceClassDef,
        },
      });

      const file = new File([JSON.stringify(codexDoc)], "user.fcd", {
        type: "application/json",
      });

      const deviceClass = await getDeviceClassFromDocument(file, {
        orgId: { type: "user", id: uuid },
        id: "my-device",
        version: "2.0.0",
        fileName: "user.fcd",
      });

      expect(deviceClass).not.toBeNull();
      expect(deviceClass?.["@description"]).toBe("User device");
    });

    it("should return null for non-existent device class", async () => {
      const codexDoc = createE173Document({
        "org.example.dev.other-device": {
          "1.0.0": createValidDeviceClass("Other device", "Test"),
        },
      });

      const file = new File([JSON.stringify(codexDoc)], "test.fcd", {
        type: "application/json",
      });

      const deviceClass = await getDeviceClassFromDocument(file, {
        orgId: { type: "org", id: "org.example" },
        id: "non-existent",
        version: "1.0.0",
        fileName: "test.fcd",
      });

      expect(deviceClass).toBeNull();
    });

    it("should return null for non-existent version", async () => {
      const codexDoc = createE173Document({
        "org.example.dev.test-device": {
          "1.0.0": createValidDeviceClass("Test device", "Test"),
        },
      });

      const file = new File([JSON.stringify(codexDoc)], "test.fcd", {
        type: "application/json",
      });

      const deviceClass = await getDeviceClassFromDocument(file, {
        orgId: { type: "org", id: "org.example" },
        id: "test-device",
        version: "2.0.0",
        fileName: "test.fcd",
      });

      expect(deviceClass).toBeNull();
    });

    it("should return null for malformed file", async () => {
      const file = new File(["{ invalid }"], "bad.fcd", {
        type: "application/json",
      });

      const deviceClass = await getDeviceClassFromDocument(file, {
        orgId: { type: "org", id: "org.example" },
        id: "test-device",
        version: "1.0.0",
        fileName: "bad.fcd",
      });

      expect(deviceClass).toBeNull();
    });
  });

  describe("validateInputFile with archives", () => {
    it("should validate a .fca archive file", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Create e173archive.json
      const archive = {
        $schema: CODEX_ARCHIVE_SCHEMA_URL,
        e173archive: {
          deviceClasses: {
            "org.example.dev.test-device": {
              "1.0.0": {
                assetsDirectory: "test-device-assets",
              },
            },
          },
        },
        info: "Test archive",
      };
      zip.file("e173archive.json", JSON.stringify(archive));

      // Create a device class document
      const doc = createE173Document({
        "org.example.dev.test-device": {
          "1.0.0": createValidDeviceClass("Test device", "Test Author"),
        },
      });
      zip.file("device.json", JSON.stringify(doc));

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "test.fca", {
        type: "application/zip",
      });

      const result = await validateInputFile(file);

      expect(result.valid).toBe(true);
      expect(result.archive).toBeDefined();
      expect(result.deviceClasses).toHaveLength(1);
      expect(result.deviceClasses?.[0]).toEqual({
        orgId: { type: "org", id: "org.example" },
        id: "test-device",
        version: "1.0.0",
        fileName: "device.json",
      });
    });

    it("should handle archives with multiple device class files", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Create e173archive.json
      const archive = {
        $schema: CODEX_ARCHIVE_SCHEMA_URL,
        e173archive: {
          deviceClasses: {},
        },
        info: "Test archive",
      };
      zip.file("e173archive.json", JSON.stringify(archive));

      // Create first device class document
      const doc1 = createE173Document({
        "org.example.dev.device-one": {
          "1.0.0": createValidDeviceClass("Device One", "Author"),
        },
      });
      zip.file("device-one.json", JSON.stringify(doc1));

      // Create second device class document with multiple versions
      const doc2 = createE173Document({
        "org.example.dev.device-two": {
          "1.0.0": createValidDeviceClass("Device Two v1", "Author"),
          "2.0.0": createValidDeviceClass("Device Two v2", "Author"),
        },
      });
      zip.file("device-two.json", JSON.stringify(doc2));

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "multi.fca", {
        type: "application/zip",
      });

      const result = await validateInputFile(file);

      expect(result.valid).toBe(true);
      expect(result.deviceClasses).toHaveLength(3);
      expect(result.deviceClasses?.map((dc) => dc.id)).toEqual([
        "device-one",
        "device-two",
        "device-two",
      ]);
    });

    it("should handle archives with user ID device classes", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const uuid = "aaaabbbb-cccc-dddd-eeee-ffffffffffff";

      const archive = {
        $schema: CODEX_ARCHIVE_SCHEMA_URL,
        e173archive: {
          deviceClasses: {},
        },
        info: "Test archive",
      };
      zip.file("e173archive.json", JSON.stringify(archive));

      const doc = createE173Document({
        [`org.esta.e173.user.${uuid}.dev.my-device`]: {
          "1.0.0": createValidDeviceClass("User device", "User"),
        },
      });
      zip.file("user-device.json", JSON.stringify(doc));

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "user.fca", {
        type: "application/zip",
      });

      const result = await validateInputFile(file);

      expect(result.valid).toBe(true);
      expect(result.deviceClasses).toHaveLength(1);
      expect(result.deviceClasses?.[0]).toEqual({
        orgId: { type: "user", id: uuid },
        id: "my-device",
        version: "1.0.0",
        fileName: "user-device.json",
      });
    });

    it("should return error if e173archive.json is missing", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      // Only add a device document, no e173archive.json
      const doc = createE173Document({
        "org.example.dev.test-device": {
          "1.0.0": createValidDeviceClass("Test", "Author"),
        },
      });
      zip.file("device.json", JSON.stringify(doc));

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "bad.fca", {
        type: "application/zip",
      });

      const result = await validateInputFile(file);

      expect(result.valid).toBe(false);
      expect(result.feedbackKind).toBe(FeedbackKind.ArchiveParsingFailed);
      expect(result.feedback).toContain("e173archive.json not found");
    });
  });

  describe("getDeviceClassFromArchive", () => {
    it("should retrieve device class from archive", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const doc = createE173Document({
        "org.example.dev.test-device": {
          "1.0.0": createValidDeviceClass("Test device", "Test Author"),
          "2.0.0": createValidDeviceClass("Test device v2", "Test Author"),
        },
      });
      zip.file("devices.json", JSON.stringify(doc));

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "test.fca", {
        type: "application/zip",
      });

      const deviceClass = await getDeviceClassFromArchive(file, {
        orgId: { type: "org", id: "org.example" },
        id: "test-device",
        version: "1.0.0",
        fileName: "devices.json",
      });

      expect(deviceClass).not.toBeNull();
      expect(deviceClass?.["@description"]).toBe("Test device");
    });

    it("should retrieve user device class from archive", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const uuid = "12345678-abcd-ef01-2345-6789abcdef01";

      const doc = createE173Document({
        [`org.esta.e173.user.${uuid}.dev.custom-light`]: {
          "3.0.0": createValidDeviceClass("Custom Light", "User"),
        },
      });
      zip.file("custom.json", JSON.stringify(doc));

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "user.fca", {
        type: "application/zip",
      });

      const deviceClass = await getDeviceClassFromArchive(file, {
        orgId: { type: "user", id: uuid },
        id: "custom-light",
        version: "3.0.0",
        fileName: "custom.json",
      });

      expect(deviceClass).not.toBeNull();
      expect(deviceClass?.["@description"]).toBe("Custom Light");
    });

    it("should return null for non-existent file in archive", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const doc = createE173Document({
        "org.example.dev.test-device": {
          "1.0.0": createValidDeviceClass("Test", "Author"),
        },
      });
      zip.file("device.json", JSON.stringify(doc));

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "test.fca", {
        type: "application/zip",
      });

      const deviceClass = await getDeviceClassFromArchive(file, {
        orgId: { type: "org", id: "org.example" },
        id: "test-device",
        version: "1.0.0",
        fileName: "non-existent.json",
      });

      expect(deviceClass).toBeNull();
    });

    it("should return null for non-existent device class", async () => {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const doc = createE173Document({
        "org.example.dev.other-device": {
          "1.0.0": createValidDeviceClass("Other", "Author"),
        },
      });
      zip.file("device.json", JSON.stringify(doc));

      const blob = await zip.generateAsync({ type: "blob" });
      const file = new File([blob], "test.fca", {
        type: "application/zip",
      });

      const deviceClass = await getDeviceClassFromArchive(file, {
        orgId: { type: "org", id: "org.example" },
        id: "non-existent",
        version: "1.0.0",
        fileName: "device.json",
      });

      expect(deviceClass).toBeNull();
    });
  });
});

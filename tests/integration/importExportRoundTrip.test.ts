// Integration test for round-trip import/export of Fluxite Codex format.
// Reads real device class files, imports them into editor state, exports them
// back, and verifies the exported form matches the original.

import { describe, test, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";
import {
  Condition,
  DeviceClass,
  E173Document,
  EstaDmx,
  MappingGroup,
  importUdr,
} from "e173";
import { getImportedDeviceClassEditor } from "../../src/features/deviceClassEditor/import";
import { exportDeviceClass } from "../../src/features/deviceClassEditor/export";
import { parseQualifiedId } from "../../src/utils/utils";

interface RoundTripTestCase {
  name: string;
  filePath: string;
  qualifiedId: string;
  version: string;
}

// Add new test cases here to extend testing
const testCases: RoundTripTestCase[] = [
  {
    name: "MAC Encore Performance CLD",
    filePath:
      "src/e173/examples/draft-2026-1/device-classes/martin_mac_encore_performance_cld.fcd",
    qualifiedId: "com.martin.dev.encore-performance-cold",
    version: "1.0.0",
  },
];

// Removes undefined values recursively (JSON doesn't support undefined, but
// exported objects may have explicit undefined values)
function removeUndefined(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeUndefined);
  }

  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (value !== undefined) {
        result[key] = removeUndefined(value);
      }
    }

    return result;
  }

  return obj;
}

// Normalizes DMX chunk IDs to canonical offset-based identifiers.
// During import/export, chunk IDs may change (e.g., "b12" -> "11" based on offsets).
function normalizeDmxChunkIds(deviceClass: DeviceClass): DeviceClass {
  if (!deviceClass.serializers) {
    return deviceClass;
  }

  const normalizedSerializers: typeof deviceClass.serializers = {};

  for (const [key, serializer] of Object.entries(deviceClass.serializers)) {
    if (
      serializer.library === "org.esta.lib.core" &&
      serializer.class === "esta-dmx" &&
      serializer.default
    ) {
      normalizedSerializers[key] = {
        ...serializer,
        default: normalizeEstaDmx(serializer.default as EstaDmx),
      };
    } else {
      normalizedSerializers[key] = serializer;
    }
  }

  return {
    ...deviceClass,
    serializers: normalizedSerializers,
  };
}

function normalizeEstaDmx(dmx: EstaDmx): EstaDmx {
  const chunkIdMapping: Record<string, string> = {};
  for (const [oldId, chunk] of Object.entries(dmx.chunks)) {
    chunkIdMapping[oldId] = chunk.offsets.join("-");
  }

  const normalizedChunks: EstaDmx["chunks"] = {};
  for (const [oldId, chunk] of Object.entries(dmx.chunks)) {
    const canonicalId = chunkIdMapping[oldId];
    normalizedChunks[canonicalId] = {
      ...chunk,
      mappingGroups: chunk.mappingGroups.map((mg) =>
        normalizeMappingGroup(mg, chunkIdMapping),
      ),
    };
  }

  return { chunks: normalizedChunks };
}

function normalizeMappingGroup(
  mg: MappingGroup,
  chunkIdMapping: Record<string, string>,
): MappingGroup {
  if (!mg.conditions) {
    return mg;
  }
  return {
    ...mg,
    conditions: mg.conditions.map((c) => normalizeCondition(c, chunkIdMapping)),
  };
}

function normalizeCondition(
  condition: Condition,
  chunkIdMapping: Record<string, string>,
): Condition {
  return {
    ...condition,
    chunk: condition.chunk
      ? (chunkIdMapping[condition.chunk] ?? condition.chunk)
      : undefined,
    conditions: condition.conditions?.map((c) =>
      normalizeCondition(c, chunkIdMapping),
    ),
  };
}

// Fields not currently imported/exported by the editor
const IGNORED_FIELDS = new Set([
  "structures", // physical structure visualization
  "looping", // parameter looping behavior
  "categories", // localization categories added by importUdr but not used
]);

function removeIgnoredFields(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(removeIgnoredFields);
  }

  if (typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      if (!IGNORED_FIELDS.has(key)) {
        result[key] = removeIgnoredFields(value);
      }
    }

    return result;
  }

  return obj;
}

function normalizeForComparison(deviceClass: DeviceClass): unknown {
  const withNormalizedDmx = normalizeDmxChunkIds(deviceClass);
  let result: unknown = withNormalizedDmx;
  result = removeUndefined(result);
  result = removeIgnoredFields(result);
  return result;
}

function compareDeviceClasses(
  original: DeviceClass,
  exported: DeviceClass,
): void {
  const normalizedOriginal = normalizeForComparison(original);
  const normalizedExported = normalizeForComparison(exported);
  expect(normalizedExported).toEqual(normalizedOriginal);
}

function readDeviceClassFromFile(
  filePath: string,
  qualifiedId: string,
  version: string,
): DeviceClass {
  const absolutePath = resolve(process.cwd(), filePath);
  const content = readFileSync(absolutePath, "utf-8");
  const doc: E173Document = importUdr(content);

  const deviceClasses = doc.e173doc.deviceClasses;
  if (!deviceClasses) {
    throw new Error(`No device classes found in ${filePath}`);
  }

  const deviceClassVersions = deviceClasses[qualifiedId];
  if (!deviceClassVersions) {
    throw new Error(
      `Device class ${qualifiedId} not found in ${filePath}. ` +
        `Available: ${Object.keys(deviceClasses).join(", ")}`,
    );
  }

  const deviceClass = deviceClassVersions[version];
  if (!deviceClass) {
    throw new Error(
      `Version ${version} of ${qualifiedId} not found in ${filePath}. ` +
        `Available: ${Object.keys(deviceClassVersions).join(", ")}`,
    );
  }

  return deviceClass;
}

describe("Import/Export Round Trip", () => {
  describe.each(testCases)("$name", (testCase) => {
    test("round-trip import and export produces equivalent result", () => {
      const original = readDeviceClassFromFile(
        testCase.filePath,
        testCase.qualifiedId,
        testCase.version,
      );

      const parsed = parseQualifiedId(testCase.qualifiedId);
      if (!parsed) {
        throw new Error(`Invalid qualified ID: ${testCase.qualifiedId}`);
      }
      const [, orgId, deviceId] = parsed;

      const editorState = getImportedDeviceClassEditor(
        orgId,
        deviceId,
        testCase.version,
        original,
      );

      const exported = exportDeviceClass(editorState);

      compareDeviceClasses(original, exported);
    });
  });
});

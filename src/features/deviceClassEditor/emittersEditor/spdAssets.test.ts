// The samples of a resource-backed SPD come out of an archive's assets on
// import and are written back into a generated file on export. These two have
// to agree, and neither is exercised by the pure import and export tests.

import { describe, test, expect } from "vitest";
import { DeviceClass } from "@cpwg-community/delver";
import { assetStorage } from "app/assetStorage";
import { DeviceClassDocument } from "app/persistentState";
import {
  getImportedDeviceClassEditor,
  hydrateResourceBackedSpds,
} from "../import";
import { generatedAssets } from "../export";

const TEST_ORG = { type: "org" as const, id: "test-org" };

const SPD_FILE = JSON.stringify({
  start: 380,
  step: 10,
  mappings: [{ value: 1, powerDistribution: [0, 0.5, 1] }],
});

function deviceClassWithResourceBackedSpd(): DeviceClass {
  return {
    libraries: {},
    "@description": "test.description",
    publishDate: "2026-01-01",
    author: "Test Author",
    locale: "en-US",
    info: {
      manufacturer: { name: "Test Manufacturer" },
      model: {
        name: "Test Model",
        category: "lighting",
        subcategory: "moving-wash",
      },
    },
    history: {},
    deviceLibrary: {
      resourceClasses: {
        "spd-class": { "@name": "n", mediaType: ["application/json"] },
      },
    },
    resources: {
      "spd-red": {
        class: "spd-class",
        access: ["read"],
        lifetime: "static",
        mediaType: "application/json",
        default: "spd-red.json",
      },
    },
    structures: {
      emitters: {
        type: "Emitters",
        value: {
          access: ["read"],
          lifetime: "static",
          default: {
            emitterGroups: {
              main: { emitters: { red: { spd: { local: "spd-red" } } } },
            },
          },
        },
      },
    },
  };
}

async function importedWithAsset(
  fileContents: string | undefined,
): Promise<DeviceClassDocument> {
  const editor = getImportedDeviceClassEditor(
    TEST_ORG,
    "test-id",
    "1.0.0",
    deviceClassWithResourceBackedSpd(),
  );

  if (fileContents !== undefined) {
    const data = new TextEncoder().encode(fileContents).buffer as ArrayBuffer;
    editor.resourceAssets["spd-red.json"] = await assetStorage.storeAsset(
      data,
      "application/json",
    );
  }

  await hydrateResourceBackedSpds(editor);
  return editor;
}

function spdOf(editor: DeviceClassDocument) {
  return Object.values(editor.emitters)[0].spd!;
}

describe("hydrateResourceBackedSpds", () => {
  test("reads the samples out of the archive's asset", async () => {
    const editor = await importedWithAsset(SPD_FILE);

    expect(spdOf(editor)).toMatchObject({
      start: 380,
      step: 10,
      mappings: [{ value: 1, powerDistribution: [0, 0.5, 1] }],
    });
  });

  test("leaves the resource with no file of its own to manage", async () => {
    const editor = await importedWithAsset(SPD_FILE);

    expect(Object.values(editor.resources)[0].default).toBeUndefined();
    expect(editor.resourceAssets).toEqual({});
  });

  test("leaves the distribution empty when the file is missing", async () => {
    const editor = await importedWithAsset(undefined);

    expect(spdOf(editor).mappings).toEqual([]);
  });

  test("leaves the distribution empty when the file is not an SPD", async () => {
    const editor = await importedWithAsset("not json at all");

    expect(spdOf(editor).mappings).toEqual([]);
  });

  test("writes back a file the next import can read", async () => {
    const editor = await importedWithAsset(SPD_FILE);

    const assets = generatedAssets(editor);
    const reimported = await importedWithAsset(assets["spd-red.json"]);

    // Entity ids are minted per import, so it is the samples that have to
    // survive the trip through the file.
    const { storage: _storage, ...samples } = spdOf(editor);
    expect(spdOf(reimported)).toMatchObject(samples);
  });
});

// Import followed by export, over documents that use structures.
//
// The unit tests either side of the boundary check each direction against a
// hand-written shape. These check that the pair agree: whatever the app cannot
// edit still has to come back out the way it went in.

import { describe, test, expect } from "vitest";
import {
  DeviceClass,
  parseFluxiteCodexDocument,
  Structure,
} from "@cpwg-community/delver";
import { getImportedDeviceClassEditor } from "./import";
import { exportDeviceClass } from "./export";
import movableDocument from "e173/examples/draft-2027-1/device-classes/movable.fcd?raw";

const ORG_ID = { type: "org", id: "com.example" } as const;

function firstDeviceClass(documentText: string): DeviceClass {
  const parsed = parseFluxiteCodexDocument(documentText);
  expect(parsed.errors).toEqual([]);

  const versions = Object.values(
    parsed.document.e173doc.deviceClasses ?? {},
  )[0];
  return Object.values(versions)[0];
}

function roundTrip(deviceClass: DeviceClass): DeviceClass {
  const editor = getImportedDeviceClassEditor(
    ORG_ID,
    "test-device-class",
    "1.0.0",
    deviceClass,
  );
  return exportDeviceClass(editor);
}

// The emitters example is written as a document rather than built as a
// DeviceClass so that delver's own parser decides what the refined types are.
function emittersDocument(): string {
  return JSON.stringify({
    $schema: "https://example.com/codex-document.json",
    e173doc: {
      deviceClasses: {
        "com.example.dev.emitting": {
          "1.0.0": {
            libraries: { "org.esta.lib.intensity-color": "1.0.0" },
            "@description": "description",
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
            parameters: {
              red: emitterParameter(),
              green: emitterParameter(),
              dimmer: {
                library: "org.esta.lib.intensity-color",
                class: "intensity/dimmer",
                access: ["write"],
                lifetime: "runtime",
              },
            },
            resources: {
              "spd-green": {
                library: "org.esta.lib.intensity-color",
                class: "spectral-power-distribution",
                access: ["read"],
                lifetime: "static",
                mediaType: "application/json",
                default: "spd-green.json",
              },
            },
            structures: {
              emitters: {
                library: "org.esta.lib.intensity-color",
                class: "emitters",
                access: ["read"],
                lifetime: "static",
                default: {
                  emitterGroups: {
                    main: {
                      emitters: {
                        red: {
                          directControl: "red",
                          commonColor: "red",
                          relativeBrightness: 1,
                          spd: {
                            direct: {
                              start: 380,
                              step: 200,
                              mappings: [
                                {
                                  value: 1,
                                  powerDistribution: [0, 1, 0.5],
                                  deviationPlus: [0, 0.1, 0.05],
                                  deviationMinus: [0, 0.1, 0.05],
                                },
                                {
                                  value: 0.5,
                                  powerDistribution: [0, 0.5, 0.2],
                                },
                              ],
                            },
                          },
                        },
                        green: {
                          directControl: "green",
                          commonColor: "green",
                          relativeBrightness: 0.8,
                          spd: { local: "spd-green" },
                        },
                      },
                    },
                  },
                  controlGroups: {
                    main: {
                      emitterGroups: ["main"],
                      masterIntensity: "dimmer",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });
}

function emitterParameter() {
  return {
    library: "org.esta.lib.intensity-color",
    class: "color/additive/emitter",
    access: ["write"],
    lifetime: "runtime",
    minimum: 0,
    maximum: 1,
  };
}

function emittersOf(
  deviceClass: DeviceClass,
): Structure & { type: "Emitters" } {
  const structure = deviceClass.structures?.emitters;
  if (structure?.type !== "Emitters") {
    throw new Error("expected an Emitters structure");
  }
  return structure;
}

describe("device class round trip", () => {
  describe("a document using structures the app cannot edit", () => {
    const source = firstDeviceClass(movableDocument);

    test("carries every structure through unchanged", () => {
      expect(roundTrip(source).structures).toEqual(source.structures);
    });

    test("has structures to carry in the first place", () => {
      expect(Object.keys(source.structures ?? {}).sort()).toEqual([
        "constraints",
        "structure",
      ]);
    });
  });

  describe("a document with an emitters structure", () => {
    const source = firstDeviceClass(emittersDocument());

    test("carries the structure's own fields through", () => {
      const exported = emittersOf(roundTrip(source));

      expect(exported.value.access).toEqual(["read"]);
      expect(exported.value.lifetime).toBe("static");
    });

    test("carries the emitter groups and their emitters through", () => {
      const exported = emittersOf(roundTrip(source));

      expect(exported.value.default).toEqual(emittersOf(source).value.default);
    });

    test("keeps an inline SPD inline", () => {
      const exported = emittersOf(roundTrip(source));
      const red = exported.value.default!.emitterGroups.main.emitters.red;

      expect(red.spd).toHaveProperty("direct");
    });

    test("keeps a resource-backed SPD pointing at its resource", () => {
      const exported = emittersOf(roundTrip(source));
      const green = exported.value.default!.emitterGroups.main.emitters.green;

      expect(green.spd).toEqual({ local: "spd-green" });
    });

    test("names the generated file as the SPD resource's default", () => {
      expect(roundTrip(source).resources?.["spd-green"].default).toBe(
        "spd-green.json",
      );
    });

    test("keeps the control group and its parameter references", () => {
      const exported = emittersOf(roundTrip(source));

      expect(exported.value.default!.controlGroups).toEqual({
        main: { emitterGroups: ["main"], masterIntensity: { id: "dimmer" } },
      });
    });
  });

  test("writes no structures key when the document has none", () => {
    const source = firstDeviceClass(emittersDocument());
    const { structures: _structures, ...withoutStructures } = source;

    expect(roundTrip(withoutStructures).structures).toBeUndefined();
  });
});

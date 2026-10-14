// Pure helpers for spectral power distributions, shared by import, export and
// the editor UI.

import {
  DeviceClassDocument,
  EntityId,
  Resource,
  Spd,
  SpdMapping,
} from "app/persistentState";

/**
 * The E1.73-3 §8.1.1.2 wire form of an SPD: the same shape whether it is
 * written inline under `direct` or into a resource's JSON file.
 */
export interface SpdSamples {
  start: number;
  step: number;
  mappings: SpdMapping[];
}

// Where an SPD with no samples yet starts. The visible spectrum runs from
// roughly 380nm to 780nm, so a 5nm grid over that range is 81 samples.
export const DEFAULT_SPD_START = 380;
export const DEFAULT_SPD_STEP = 5;

/**
 * The resources that hold an emitter's SPD samples.
 *
 * These are managed by the Emitters structure rather than by the user: their
 * file is generated on export, and deleting one would break the emitter.
 */
export function spdBackedResourceIds(
  editor: Pick<DeviceClassDocument, "emitters">,
): Set<EntityId> {
  const ids = new Set<EntityId>();
  for (const emitter of Object.values(editor.emitters)) {
    if (emitter.spd?.storage.type === "resource") {
      ids.add(emitter.spd.storage.resourceId);
    }
  }
  return ids;
}

/** The file an SPD-backed resource's JSON is written to inside an archive. */
export function spdResourceFileName(resource: Pick<Resource, "codexId">) {
  return `${resource.codexId}.json`;
}

/** The wavelength in nm of sample `index` of an SPD. */
export function wavelengthAt(spd: Pick<Spd, "start" | "step">, index: number) {
  return spd.start + index * spd.step;
}

/**
 * The number of samples an SPD's arrays are expected to hold, taken from its
 * first mapping. An SPD with no mappings has no length yet.
 */
export function spdSampleCount(spd: Pick<Spd, "mappings">): number | undefined {
  return spd.mappings[0]?.powerDistribution.length;
}

/** Every sample array of a mapping, including the deviations it carries. */
function mappingArrays(mapping: SpdMapping): number[][] {
  return [
    mapping.powerDistribution,
    ...(mapping.deviationPlus ? [mapping.deviationPlus] : []),
    ...(mapping.deviationMinus ? [mapping.deviationMinus] : []),
  ];
}

/**
 * The sample-array lengths that disagree with the SPD's first mapping.
 *
 * The editor cannot construct such an SPD, but an imported document can hold
 * one, so the state is representable and reported rather than rejected.
 */
export function spdLengthMismatches(spd: Spd): number[] {
  const expected = spdSampleCount(spd);
  if (expected === undefined) return [];

  const mismatches = new Set<number>();
  for (const mapping of spd.mappings) {
    for (const array of mappingArrays(mapping)) {
      if (array.length !== expected) {
        mismatches.add(array.length);
      }
    }
  }
  return [...mismatches];
}

/** Divides through by the largest sample so that the peak reads 1.0. */
export function normalizeSamples(samples: number[]): number[] | undefined {
  const peak = Math.max(...samples);
  if (!Number.isFinite(peak) || peak <= 0) {
    return undefined;
  }
  return samples.map((sample) => sample / peak);
}

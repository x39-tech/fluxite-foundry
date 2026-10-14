// Reads a spectral power distribution out of a file the user picked.
//
// Pure and DOM-free: the dialog reads the file's text and hands it here, so
// every format and every refusal is unit testable.

import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { SpdMapping } from "app/persistentState";
import { normalizeSamples, SpdSamples } from "./spd";

export const SPD_IMPORT_ERRORS = {
  empty: msg({
    id: "deviceClassEditor.emitters.spdImport.error.empty",
    message: "The file has no data in it.",
  }),
  invalidJson: msg({
    id: "deviceClassEditor.emitters.spdImport.error.invalidJson",
    message: "The file looks like JSON, but it could not be read.",
  }),
  invalidJsonShape: msg({
    id: "deviceClassEditor.emitters.spdImport.error.invalidJsonShape",
    message:
      "The JSON file is not a spectral power distribution. It needs a numeric 'start' and 'step' and a list of 'mappings'.",
  }),
  notNumeric: msg({
    id: "deviceClassEditor.emitters.spdImport.error.notNumeric",
    message: "Line {line} of the file is not a number.",
  }),
  tooManyColumns: msg({
    id: "deviceClassEditor.emitters.spdImport.error.tooManyColumns",
    message:
      "The file has {columns} columns. Use one column of power values, or two columns of wavelength and power.",
  }),
  tooFewSamples: msg({
    id: "deviceClassEditor.emitters.spdImport.error.tooFewSamples",
    message: "A spectral power distribution needs at least two samples.",
  }),
  nonUniformSpacing: msg({
    id: "deviceClassEditor.emitters.spdImport.error.nonUniformSpacing",
    message:
      "The wavelengths in the file are not evenly spaced. The step from {firstStep}nm changes at line {line}. Resample the data onto an even grid before importing it.",
  }),
  invalidStep: msg({
    id: "deviceClassEditor.emitters.spdImport.error.invalidStep",
    message: "The wavelength step must be greater than zero.",
  }),
  noPeak: msg({
    id: "deviceClassEditor.emitters.spdImport.error.noPeak",
    message:
      "The power values are all zero or negative, so the curve cannot be normalised.",
  }),
  gridMismatch: msg({
    id: "deviceClassEditor.emitters.spdImport.error.gridMismatch",
    message:
      "This emitter already holds {expectedCount} samples from {expectedStart}nm in {expectedStep}nm steps. The file holds {actualCount} samples from {actualStart}nm in {actualStep}nm steps.",
  }),
  duplicateValue: msg({
    id: "deviceClassEditor.emitters.spdImport.error.duplicateValue",
    message: "This emitter already has a curve at value {value}.",
  }),
};

/** The grid an import has to land on, when the emitter already has samples. */
export interface SpdGrid {
  start: number;
  step: number;
  sampleCount: number;
}

export interface SpdImportOptions {
  /**
   * The parameter value the curve is measured at. Used for a CSV file, which
   * carries no value of its own; a Codex-shaped JSON file brings its own.
   */
  value: number;
  /** Wavelength of the first sample, for a file with no wavelength column. */
  start: number;
  /** Wavelength step, for a file with no wavelength column. */
  step: number;
  /** The grid the emitter's existing curves are on, if it has any. */
  grid?: SpdGrid;
  /** The values the emitter's existing curves are measured at. */
  existingValues?: number[];
}

export type SpdParseResult =
  | { ok: true; samples: SpdSamples }
  | { ok: false; error: MessageDescriptor };

// Wavelength steps are read from decimal text, so exact equality is too strict.
const SPACING_TOLERANCE = 1e-6;

const DELIMITERS = [",", ";", "\t"];

export function parseSpdFile(
  text: string,
  options: SpdImportOptions,
): SpdParseResult {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: SPD_IMPORT_ERRORS.empty };
  }

  const parsed = trimmed.startsWith("{")
    ? parseJsonSpd(trimmed)
    : parseCsvSpd(trimmed, options);

  if (!parsed.ok) return parsed;

  return checkAgainstEmitter(normalized(parsed.samples), options);
}

// ---------------------------------------------------------------------------
// JSON
// ---------------------------------------------------------------------------

/**
 * Reads the JSON form of an SPD.
 *
 * §10.1.1 and §8.1.1.2 of the draft disagree on whether a resource file holds
 * the SPD object or the Direct object at its root, so both are accepted. We
 * write the bare Direct, following the more specific §8.1.1.2.
 */
export function parseSpdJson(text: string): SpdParseResult {
  return parseJsonSpd(text.trim());
}

function parseJsonSpd(text: string): SpdParseResult {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (_e) {
    return { ok: false, error: SPD_IMPORT_ERRORS.invalidJson };
  }

  const direct =
    isRecord(value) && isRecord(value.direct) ? value.direct : value;

  if (
    !isRecord(direct) ||
    typeof direct.start !== "number" ||
    typeof direct.step !== "number" ||
    !Array.isArray(direct.mappings)
  ) {
    return { ok: false, error: SPD_IMPORT_ERRORS.invalidJsonShape };
  }

  const mappings: SpdMapping[] = [];
  for (const mapping of direct.mappings) {
    if (
      !isRecord(mapping) ||
      typeof mapping.value !== "number" ||
      !isNumberArray(mapping.powerDistribution)
    ) {
      return { ok: false, error: SPD_IMPORT_ERRORS.invalidJsonShape };
    }

    mappings.push({
      value: mapping.value,
      powerDistribution: mapping.powerDistribution,
      deviationPlus: isNumberArray(mapping.deviationPlus)
        ? mapping.deviationPlus
        : undefined,
      deviationMinus: isNumberArray(mapping.deviationMinus)
        ? mapping.deviationMinus
        : undefined,
    });
  }

  if (mappings.length === 0 || mappings[0].powerDistribution.length < 2) {
    return { ok: false, error: SPD_IMPORT_ERRORS.tooFewSamples };
  }

  if (direct.step <= 0) {
    return { ok: false, error: SPD_IMPORT_ERRORS.invalidStep };
  }

  return {
    ok: true,
    samples: { start: direct.start, step: direct.step, mappings },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((n) => typeof n === "number");
}

// ---------------------------------------------------------------------------
// CSV
// ---------------------------------------------------------------------------

function parseCsvSpd(text: string, options: SpdImportOptions): SpdParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line, index) => ({ text: line.trim(), number: index + 1 }))
    .filter((line) => line.text.length > 0);

  if (lines.length === 0) {
    return { ok: false, error: SPD_IMPORT_ERRORS.empty };
  }

  const delimiter = sniffDelimiter(lines[0].text);
  const rows = lines.map((line) => ({
    cells: line.text.split(delimiter).map((cell) => cell.trim()),
    number: line.number,
  }));

  // A header row is one whose first cell is not a number.
  const dataRows =
    parseNumber(rows[0].cells[0]) === undefined ? rows.slice(1) : rows;

  if (dataRows.length < 2) {
    return { ok: false, error: SPD_IMPORT_ERRORS.tooFewSamples };
  }

  const columns = dataRows[0].cells.length;
  if (columns > 2) {
    return {
      ok: false,
      error: { ...SPD_IMPORT_ERRORS.tooManyColumns, values: { columns } },
    };
  }

  const wavelengths: number[] = [];
  const powers: number[] = [];

  for (const row of dataRows) {
    const values = row.cells.map(parseNumber);
    if (values.length !== columns || values.some((v) => v === undefined)) {
      return {
        ok: false,
        error: {
          ...SPD_IMPORT_ERRORS.notNumeric,
          values: { line: row.number },
        },
      };
    }

    if (columns === 2) {
      wavelengths.push(values[0]!);
      powers.push(values[1]!);
    } else {
      powers.push(values[0]!);
    }
  }

  let start = options.start;
  let step = options.step;

  if (columns === 2) {
    start = wavelengths[0];
    step = wavelengths[1] - wavelengths[0];

    for (let i = 1; i < wavelengths.length; i++) {
      const thisStep = wavelengths[i] - wavelengths[i - 1];
      if (Math.abs(thisStep - step) > SPACING_TOLERANCE) {
        return {
          ok: false,
          error: {
            ...SPD_IMPORT_ERRORS.nonUniformSpacing,
            values: { firstStep: step, line: dataRows[i].number },
          },
        };
      }
    }
  }

  if (!(step > 0)) {
    return { ok: false, error: SPD_IMPORT_ERRORS.invalidStep };
  }

  return {
    ok: true,
    samples: {
      start,
      step,
      mappings: [{ value: options.value, powerDistribution: powers }],
    },
  };
}

function sniffDelimiter(line: string): string {
  let best = DELIMITERS[0];
  let bestCount = 0;
  for (const delimiter of DELIMITERS) {
    const count = line.split(delimiter).length - 1;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

function parseNumber(cell: string | undefined): number | undefined {
  if (cell === undefined || cell.length === 0) return undefined;
  const value = Number(cell);
  return Number.isFinite(value) ? value : undefined;
}

// ---------------------------------------------------------------------------
// Normalisation and checks
// ---------------------------------------------------------------------------

// Scales every curve so its peak reads 1.0. Deviations are scaled by the same
// factor as the curve they belong to, so they stay the same fraction of it.
function normalized(samples: SpdSamples): SpdSamples {
  return {
    ...samples,
    mappings: samples.mappings.map((mapping) => {
      const peak = Math.max(...mapping.powerDistribution);
      const scaled = normalizeSamples(mapping.powerDistribution);
      if (!scaled) return mapping;

      return {
        ...mapping,
        powerDistribution: scaled,
        deviationPlus: mapping.deviationPlus?.map((v) => v / peak),
        deviationMinus: mapping.deviationMinus?.map((v) => v / peak),
      };
    }),
  };
}

function checkAgainstEmitter(
  samples: SpdSamples,
  options: SpdImportOptions,
): SpdParseResult {
  for (const mapping of samples.mappings) {
    if (!normalizeSamples(mapping.powerDistribution)) {
      return { ok: false, error: SPD_IMPORT_ERRORS.noPeak };
    }
  }

  const grid = options.grid;
  const sampleCount = samples.mappings[0].powerDistribution.length;
  if (
    grid &&
    (Math.abs(grid.start - samples.start) > SPACING_TOLERANCE ||
      Math.abs(grid.step - samples.step) > SPACING_TOLERANCE ||
      grid.sampleCount !== sampleCount)
  ) {
    return {
      ok: false,
      error: {
        ...SPD_IMPORT_ERRORS.gridMismatch,
        values: {
          expectedCount: grid.sampleCount,
          expectedStart: grid.start,
          expectedStep: grid.step,
          actualCount: sampleCount,
          actualStart: samples.start,
          actualStep: samples.step,
        },
      },
    };
  }

  const taken = new Set(options.existingValues ?? []);
  for (const mapping of samples.mappings) {
    if (taken.has(mapping.value)) {
      return {
        ok: false,
        error: {
          ...SPD_IMPORT_ERRORS.duplicateValue,
          values: { value: mapping.value },
        },
      };
    }
    taken.add(mapping.value);
  }

  return { ok: true, samples };
}

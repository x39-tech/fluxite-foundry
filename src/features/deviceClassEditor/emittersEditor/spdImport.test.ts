import { describe, test, expect } from "vitest";
import { parseSpdFile, SpdImportOptions, SPD_IMPORT_ERRORS } from "./spdImport";
import { SpdSamples } from "./spd";

const DEFAULT_OPTIONS: SpdImportOptions = { value: 1, start: 400, step: 10 };

function parse(text: string, options: Partial<SpdImportOptions> = {}) {
  return parseSpdFile(text, { ...DEFAULT_OPTIONS, ...options });
}

function parsed(text: string, options: Partial<SpdImportOptions> = {}) {
  const result = parse(text, options);
  if (!result.ok) {
    throw new Error(`expected a successful parse, got ${result.error.id}`);
  }
  return result.samples;
}

function errorId(text: string, options: Partial<SpdImportOptions> = {}) {
  const result = parse(text, options);
  return result.ok ? undefined : result.error.id;
}

function gridOf(samples: SpdSamples) {
  return {
    start: samples.start,
    step: samples.step,
    sampleCount: samples.mappings[0].powerDistribution.length,
  };
}

describe("parseSpdFile", () => {
  describe("a single column of power values", () => {
    test("takes its grid from the options", () => {
      const samples = parsed("0\n2\n4\n2\n0");

      expect(samples.start).toBe(400);
      expect(samples.step).toBe(10);
    });

    test("normalises the values so the peak reads 1", () => {
      const samples = parsed("0\n2\n4\n2\n0");

      expect(samples.mappings[0].powerDistribution).toEqual([
        0, 0.5, 1, 0.5, 0,
      ]);
    });

    test("measures the curve at the value it was given", () => {
      const samples = parsed("0\n1\n0", { value: 0.25 });

      expect(samples.mappings[0].value).toBe(0.25);
    });
  });

  describe("two columns of wavelength and power", () => {
    test("derives the grid from the wavelength column", () => {
      const samples = parsed("400,0\n405,1\n410,0.5");

      expect(samples.start).toBe(400);
      expect(samples.step).toBe(5);
    });

    test("refuses unevenly spaced wavelengths", () => {
      expect(errorId("400,0\n405,1\n420,0.5")).toBe(
        SPD_IMPORT_ERRORS.nonUniformSpacing.id,
      );
    });

    test("refuses more than two columns", () => {
      expect(errorId("400,0,9\n405,1,9\n410,0,9")).toBe(
        SPD_IMPORT_ERRORS.tooManyColumns.id,
      );
    });
  });

  describe("delimiters and headers", () => {
    test("reads semicolon separated values", () => {
      expect(parsed("400;0\n410;1\n420;0").step).toBe(10);
    });

    test("reads tab separated values", () => {
      expect(parsed("400\t0\n410\t1\n420\t0").step).toBe(10);
    });

    test("skips a header row", () => {
      const samples = parsed("wavelength,power\n400,0\n410,1\n420,0");

      expect(samples.start).toBe(400);
      expect(samples.mappings[0].powerDistribution).toHaveLength(3);
    });

    test("ignores blank lines", () => {
      expect(
        parsed("400,0\n\n410,1\n\n420,0").mappings[0].powerDistribution,
      ).toHaveLength(3);
    });

    test("reports the line a non-numeric value is on", () => {
      const result = parse("400,0\n410,oops\n420,0");

      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.id).toBe(SPD_IMPORT_ERRORS.notNumeric.id);
      expect(result.error.values).toEqual({ line: 2 });
    });
  });

  describe("Codex-shaped JSON", () => {
    const direct = {
      start: 380,
      step: 100,
      mappings: [
        {
          value: 1,
          powerDistribution: [0, 4, 2],
          deviationPlus: [0, 0.4, 0.2],
        },
      ],
    };

    test("reads a bare Direct object", () => {
      const samples = parsed(JSON.stringify(direct));

      expect(samples.start).toBe(380);
      expect(samples.step).toBe(100);
    });

    test("reads an object wrapping one under 'direct'", () => {
      expect(parsed(JSON.stringify({ direct })).start).toBe(380);
    });

    test("scales deviations by the same factor as the curve", () => {
      const mapping = parsed(JSON.stringify(direct)).mappings[0];

      expect(mapping.powerDistribution).toEqual([0, 1, 0.5]);
      expect(mapping.deviationPlus).toEqual([0, 0.1, 0.05]);
    });

    test("keeps the parameter values the file carries", () => {
      const twoCurves = {
        ...direct,
        mappings: [
          ...direct.mappings,
          { value: 0.5, powerDistribution: [0, 2, 1] },
        ],
      };

      expect(
        parsed(JSON.stringify(twoCurves)).mappings.map((m) => m.value),
      ).toEqual([1, 0.5]);
    });

    test("refuses JSON that is not an SPD", () => {
      expect(errorId(JSON.stringify({ hello: "world" }))).toBe(
        SPD_IMPORT_ERRORS.invalidJsonShape.id,
      );
    });

    test("refuses JSON it cannot read at all", () => {
      expect(errorId("{ not json")).toBe(SPD_IMPORT_ERRORS.invalidJson.id);
    });
  });

  describe("checks against the emitter", () => {
    const existing = gridOf(parsed("400,0\n410,1\n420,0"));

    test("accepts a file on the same grid", () => {
      expect(
        parse("400,0\n410,0.5\n420,0", { grid: existing, value: 0.5 }).ok,
      ).toBe(true);
    });

    test("refuses a file with a different sample count", () => {
      expect(
        errorId("400,0\n410,1\n420,0\n430,0", { grid: existing, value: 0.5 }),
      ).toBe(SPD_IMPORT_ERRORS.gridMismatch.id);
    });

    test("refuses a file starting at a different wavelength", () => {
      expect(
        errorId("500,0\n510,1\n520,0", { grid: existing, value: 0.5 }),
      ).toBe(SPD_IMPORT_ERRORS.gridMismatch.id);
    });

    test("refuses a file with a different step", () => {
      expect(
        errorId("400,0\n420,1\n440,0", { grid: existing, value: 0.5 }),
      ).toBe(SPD_IMPORT_ERRORS.gridMismatch.id);
    });

    test("refuses a value the emitter already has a curve at", () => {
      expect(
        errorId("400,0\n410,1\n420,0", {
          grid: existing,
          existingValues: [1],
          value: 1,
        }),
      ).toBe(SPD_IMPORT_ERRORS.duplicateValue.id);
    });
  });

  describe("refusals", () => {
    test("refuses an empty file", () => {
      expect(errorId("   \n  \n")).toBe(SPD_IMPORT_ERRORS.empty.id);
    });

    test("refuses a single sample", () => {
      expect(errorId("400,1")).toBe(SPD_IMPORT_ERRORS.tooFewSamples.id);
    });

    test("refuses a curve with no positive value to normalise against", () => {
      expect(errorId("0\n0\n0")).toBe(SPD_IMPORT_ERRORS.noPeak.id);
    });

    test("refuses a step of zero", () => {
      expect(errorId("0\n1\n0", { step: 0 })).toBe(
        SPD_IMPORT_ERRORS.invalidStep.id,
      );
    });
  });
});

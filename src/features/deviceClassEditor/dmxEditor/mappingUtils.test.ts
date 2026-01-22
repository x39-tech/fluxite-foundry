import { describe, it, expect } from "vitest";
import {
  validateSequenceSteps,
  calculateTotalDuration,
  formatDuration,
  getHoldMilliseconds,
  createHoldValue,
  getEffectiveEnd,
  normalizeEndValue,
} from "./mappingUtils";
import { DmxSequenceStep } from "app/persistentState";

describe("mappingUtils", () => {
  describe("validateSequenceSteps", () => {
    it("returns valid for a sequence with one step", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      const result = validateSequenceSteps(steps);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
    });

    it("returns valid for a sequence with multiple steps", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 200, hold: { milliseconds: 500 } },
        { chunkStart: 200, chunkEnd: 255, hold: { milliseconds: 500 } },
      ];
      const result = validateSequenceSteps(steps);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("returns valid for a sequence ending with indefinite hold", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 255, hold: "indefinite" },
      ];
      const result = validateSequenceSteps(steps);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it("returns error for zero steps", () => {
      const steps: DmxSequenceStep[] = [];
      const result = validateSequenceSteps(steps);
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("zero_steps");
    });

    it("returns warning for indefinite hold on non-last step", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: "indefinite" },
        { chunkStart: 100, chunkEnd: 255, hold: { milliseconds: 500 } },
      ];
      const result = validateSequenceSteps(steps);
      expect(result.isValid).toBe(true); // Still valid, just has warning
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe("indefinite_not_last");
      expect(result.warnings[0].stepIndex).toBe(0);
    });

    it("returns multiple warnings for multiple indefinite holds on non-last steps", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: "indefinite" },
        { chunkStart: 100, chunkEnd: 200, hold: "indefinite" },
        { chunkStart: 200, chunkEnd: 255, hold: { milliseconds: 500 } },
      ];
      const result = validateSequenceSteps(steps);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings[0].stepIndex).toBe(0);
      expect(result.warnings[1].stepIndex).toBe(1);
    });
  });

  describe("calculateTotalDuration", () => {
    it("returns 0 for empty steps", () => {
      expect(calculateTotalDuration([])).toBe(0);
    });

    it("returns sum of milliseconds for finite steps", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 200, hold: { milliseconds: 1000 } },
        { chunkStart: 200, chunkEnd: 255, hold: { milliseconds: 250 } },
      ];
      expect(calculateTotalDuration(steps)).toBe(1750);
    });

    it("returns indefinite if any step is indefinite", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 255, hold: "indefinite" },
      ];
      expect(calculateTotalDuration(steps)).toBe("indefinite");
    });

    it("returns indefinite if first step is indefinite", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 255, hold: "indefinite" },
      ];
      expect(calculateTotalDuration(steps)).toBe("indefinite");
    });
  });

  describe("formatDuration", () => {
    it("formats indefinite", () => {
      expect(formatDuration("indefinite")).toBe("indefinite");
    });

    it("formats milliseconds for small values", () => {
      expect(formatDuration(500)).toBe("500ms");
      expect(formatDuration(999)).toBe("999ms");
    });

    it("formats seconds for values >= 1000ms", () => {
      expect(formatDuration(1000)).toBe("1.0s");
      expect(formatDuration(1500)).toBe("1.5s");
      expect(formatDuration(2500)).toBe("2.5s");
    });

    it("formats minutes for values >= 60s", () => {
      expect(formatDuration(60000)).toBe("1m");
      expect(formatDuration(120000)).toBe("2m");
      expect(formatDuration(90000)).toBe("1m 30s");
    });
  });

  describe("getHoldMilliseconds", () => {
    it("returns milliseconds for finite hold", () => {
      expect(getHoldMilliseconds({ milliseconds: 1000 })).toBe(1000);
    });

    it("returns undefined for indefinite hold", () => {
      expect(getHoldMilliseconds("indefinite")).toBeUndefined();
    });
  });

  describe("createHoldValue", () => {
    it("creates milliseconds hold for number", () => {
      expect(createHoldValue(1000)).toEqual({ milliseconds: 1000 });
    });

    it("creates indefinite hold for indefinite string", () => {
      expect(createHoldValue("indefinite")).toBe("indefinite");
    });
  });

  describe("getEffectiveEnd", () => {
    describe("numeric values", () => {
      it("returns end when end is defined", () => {
        expect(getEffectiveEnd(0, 100)).toBe(100);
      });

      it("returns start when end is undefined", () => {
        expect(getEffectiveEnd(50, undefined)).toBe(50);
      });

      it("returns end even when end equals start", () => {
        expect(getEffectiveEnd(42, 42)).toBe(42);
      });

      it("handles zero values correctly", () => {
        expect(getEffectiveEnd(0, 0)).toBe(0);
        expect(getEffectiveEnd(0, undefined)).toBe(0);
      });

      it("handles negative values", () => {
        expect(getEffectiveEnd(-10, undefined)).toBe(-10);
        expect(getEffectiveEnd(-10, -5)).toBe(-5);
      });
    });

    describe("boolean values", () => {
      it("returns end when end is defined", () => {
        expect(getEffectiveEnd(false, true)).toBe(true);
        expect(getEffectiveEnd(true, false)).toBe(false);
      });

      it("returns start when end is undefined", () => {
        expect(getEffectiveEnd(true, undefined)).toBe(true);
        expect(getEffectiveEnd(false, undefined)).toBe(false);
      });

      it("returns end even when end equals start", () => {
        expect(getEffectiveEnd(true, true)).toBe(true);
        expect(getEffectiveEnd(false, false)).toBe(false);
      });
    });

    describe("undefined start", () => {
      it("returns end when start is undefined and end is defined", () => {
        expect(getEffectiveEnd(undefined, 100)).toBe(100);
      });

      it("returns undefined when both are undefined", () => {
        expect(getEffectiveEnd(undefined, undefined)).toBe(undefined);
      });
    });
  });

  describe("normalizeEndValue", () => {
    describe("numeric values", () => {
      it("returns undefined when end equals start", () => {
        expect(normalizeEndValue(10, 10)).toBe(undefined);
      });

      it("returns the end value when end differs from start", () => {
        expect(normalizeEndValue(0, 100)).toBe(100);
      });

      it("handles zero correctly", () => {
        expect(normalizeEndValue(0, 0)).toBe(undefined);
        expect(normalizeEndValue(0, 1)).toBe(1);
        expect(normalizeEndValue(1, 0)).toBe(0);
      });

      it("handles negative values", () => {
        expect(normalizeEndValue(-10, -10)).toBe(undefined);
        expect(normalizeEndValue(-10, -5)).toBe(-5);
      });

      it("handles floating point values", () => {
        expect(normalizeEndValue(0.5, 0.5)).toBe(undefined);
        expect(normalizeEndValue(0.5, 1.5)).toBe(1.5);
      });
    });

    describe("boolean values", () => {
      it("returns undefined when end equals start", () => {
        expect(normalizeEndValue(true, true)).toBe(undefined);
        expect(normalizeEndValue(false, false)).toBe(undefined);
      });

      it("returns the end value when end differs from start", () => {
        expect(normalizeEndValue(false, true)).toBe(true);
        expect(normalizeEndValue(true, false)).toBe(false);
      });
    });

    describe("undefined values", () => {
      it("returns undefined when end is undefined", () => {
        expect(normalizeEndValue(10, undefined)).toBe(undefined);
      });

      it("returns end when start is undefined and end is defined", () => {
        expect(normalizeEndValue(undefined, 100)).toBe(100);
      });

      it("returns undefined when both are undefined", () => {
        expect(normalizeEndValue(undefined, undefined)).toBe(undefined);
      });
    });
  });
});

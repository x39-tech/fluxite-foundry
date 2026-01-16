import { DmxSequenceStep, HoldValue } from "app/persistentState";

export interface SequenceWarning {
  type: "indefinite_not_last";
  stepIndex: number;
  message: string;
}

export interface SequenceError {
  type: "zero_steps";
  message: string;
}

export interface SequenceValidationResult {
  isValid: boolean;
  warnings: SequenceWarning[];
  errors: SequenceError[];
}

/**
 * Validates sequence steps for constraint violations.
 * - Zero steps is an error (invalid state)
 * - Indefinite hold on non-last step is a warning (can occur from imports)
 */
export function validateSequenceSteps(
  steps: DmxSequenceStep[],
): SequenceValidationResult {
  const warnings: SequenceWarning[] = [];
  const errors: SequenceError[] = [];

  if (steps.length === 0) {
    errors.push({
      type: "zero_steps",
      message: "Sequence must have at least one step",
    });
  }

  steps.forEach((step, index) => {
    if (step.hold === "indefinite" && index !== steps.length - 1) {
      warnings.push({
        type: "indefinite_not_last",
        stepIndex: index,
        message: `Step ${index + 1} has indefinite hold but is not the last step`,
      });
    }
  });

  return {
    isValid: errors.length === 0,
    warnings,
    errors,
  };
}

/**
 * Calculates the total duration of a sequence.
 * Returns "indefinite" if any step has indefinite hold.
 */
export function calculateTotalDuration(
  steps: DmxSequenceStep[],
): number | "indefinite" {
  let total = 0;

  for (const step of steps) {
    if (step.hold === "indefinite") {
      return "indefinite";
    }
    total += step.hold.milliseconds;
  }

  return total;
}

/**
 * Formats a duration for display.
 */
export function formatDuration(duration: number | "indefinite"): string {
  if (duration === "indefinite") {
    return "indefinite";
  }

  if (duration < 1000) {
    return `${duration}ms`;
  }

  const seconds = duration / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Gets the milliseconds value from a HoldValue, or undefined if indefinite.
 */
export function getHoldMilliseconds(hold: HoldValue): number | undefined {
  if (hold === "indefinite") {
    return undefined;
  }
  return hold.milliseconds;
}

/**
 * Creates a HoldValue from milliseconds or "indefinite".
 */
export function createHoldValue(value: number | "indefinite"): HoldValue {
  if (value === "indefinite") {
    return "indefinite";
  }
  return { milliseconds: value };
}

/**
 * Formats a bound value for display.
 */
export function formatBoundValue(value: number | boolean | undefined): string {
  if (value === undefined) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  return value.toString();
}

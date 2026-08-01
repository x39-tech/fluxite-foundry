import {
  LocalOrImportedId,
  CodexId,
  DmxSequenceStep,
  HoldValue,
} from "app/persistentState";
import {
  LocalizedClassEnumChoice,
  LocalizedInstanceEnumChoice,
} from "../stateTransformations";
import { LocalizedString } from "features/localizations/localize";

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

/**
 * Represents an effective enum choice with its computed index.
 * Combines class and instance choices, excluding any disabled choices.
 */
export interface EffectiveEnumChoice {
  index: number;
  codexId: CodexId;
  name: LocalizedString;
}

/**
 * Combines class and instance enum choices, excluding any choices
 * that are disabled via enumExclusions. Class choices come first,
 * followed by instance choices. The index is computed based on position.
 */
export function getEffectiveEnumChoices(
  classChoices: LocalizedClassEnumChoice[],
  instanceChoices: LocalizedInstanceEnumChoice[],
  exclusions: readonly LocalOrImportedId[] | undefined,
): EffectiveEnumChoice[] {
  const excludedSet = new Set<string>(exclusions ?? []);

  const filteredClassChoices = classChoices.filter(
    (choice) => !excludedSet.has(choice.id),
  );

  // Instance choices are already sorted by index
  const sortedInstanceChoices = [...instanceChoices].sort(
    (a, b) => a.index - b.index,
  );

  const result: EffectiveEnumChoice[] = [];

  // Add class choices first
  filteredClassChoices.forEach((choice) => {
    result.push({
      index: result.length,
      codexId: choice.codexId,
      name: choice.name,
    });
  });

  // Add instance choices after
  sortedInstanceChoices.forEach((choice) => {
    result.push({
      index: result.length,
      codexId: choice.codexId,
      name: choice.name,
    });
  });

  return result;
}

/**
 * Formats an enum bound value for display.
 * Returns the choice name with its index, e.g., "Open (0)".
 * For invalid values, returns "Invalid: {value}".
 */
export function formatEnumBoundValue(
  value: number | boolean | undefined,
  choices: EffectiveEnumChoice[],
): string {
  if (value === undefined) return "null";

  // Check if value is a valid integer index
  if (typeof value !== "number" || !Number.isInteger(value)) {
    return `Invalid: ${value}`;
  }

  const choice = choices.find((c) => c.index === value);
  if (choice) {
    return `${choice.name.value} (${value})`;
  }

  return `Invalid: ${value}`;
}

export type BoundValue = number | boolean | undefined;

/**
 * Gets the effective end value for display purposes.
 * When end is undefined, it should be displayed as the start value.
 */
export function getEffectiveEnd(
  start: BoundValue,
  end: BoundValue,
): BoundValue {
  return end === undefined ? start : end;
}

/**
 * Normalizes the end value for storage.
 * When end equals start, it should be stored as undefined.
 * This ensures that "start=5, end=5" is stored as "start=5, end=undefined".
 */
export function normalizeEndValue(
  start: BoundValue,
  newEnd: BoundValue,
): BoundValue {
  return newEnd === start ? undefined : newEnd;
}

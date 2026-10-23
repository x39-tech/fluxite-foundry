// Helpers for reading and writing parameter values through the DMX test
// driver.

import {
  DriverParamState,
  DriverParamValue,
  ParamReference,
} from "@cpwg-community/delver";
import {
  fcDataTypes,
  FCUnit,
  fcUnitNames,
  ParameterCount,
} from "app/persistentState";
import { MappableParameter } from "../dmxEditor/state";

/** Driver parameter states, keyed by `serializeParamRef`. */
export type ParamStates = Map<string, DriverParamState>;

export function serializeParamRef(ref: ParamReference): string {
  if (ref.index !== undefined) {
    return `${ref.id}[${ref.index}]`;
  }
  return ref.id;
}

export function paramStatesByRef(states: DriverParamState[]): ParamStates {
  return new Map(
    states.map((state) => [serializeParamRef(state.param), state]),
  );
}

export function getParameterCount(count: ParameterCount | undefined): number {
  if (!count) {
    return 1;
  }
  if (count.type === "fixed") {
    return count.value;
  }
  // For dynamic count, use minimum as the initial count
  return count.min;
}

/**
 * A driver value as a number. Enum values are their choice's index and
 * booleans are 0 or 1.
 */
export function getNumericValue(
  value: DriverParamValue | undefined,
): number | null {
  if (!value || value.type === "null") {
    return null;
  }
  if (value.type === "bool") {
    return value.value ? 1 : 0;
  }
  return value.value;
}

export function getBooleanValue(
  value: DriverParamValue | undefined,
): boolean | null {
  if (!value || value.type === "null") {
    return null;
  }
  if (value.type === "bool") {
    return value.value;
  }
  return value.value !== 0;
}

/**
 * The value a parameter goes back to when it is reset: the value the driver
 * started it at, or failing that, the parameter's default. The driver starts a
 * parameter without a value when another parameter it shares DMX slots with is
 * the one in control, and resetting it then takes control back with its
 * default. Absent when there is nothing to reset to.
 */
export function getResetValue(
  mappable: MappableParameter,
  initialState: DriverParamState | undefined,
): DriverParamValue | undefined {
  if (initialState && initialState.value.type !== "null") {
    return initialState.value;
  }

  const defaultValue = mappable.param.default;
  const dataType = mappable.paramClass.dataType;
  switch (defaultValue?.type) {
    case "inactive":
      return { type: "null" };
    case "numeric":
      if (dataType === fcDataTypes.NUMBER) {
        return { type: "numeric", value: defaultValue.value };
      }
      return dataType === fcDataTypes.ENUM
        ? { type: "enum", value: defaultValue.value }
        : undefined;
    case "bool":
      return dataType === fcDataTypes.BOOLEAN
        ? { type: "bool", value: defaultValue.value }
        : undefined;
  }
}

const SI_PREFIXES: { [key: number]: string } = {
  // I hate javascript
  "-24": "yocto",
  "-21": "zepto",
  "-18": "atto",
  "-15": "femto",
  "-12": "pico",
  "-9": "nano",
  "-6": "micro",
  "-3": "milli",
  "0": "",
  "3": "kilo",
  "6": "mega",
  "9": "giga",
  "12": "tera",
  "15": "peta",
  "18": "exa",
  "21": "zetta",
  "24": "yotta",
};

/** The name of a unit for display, e.g. "kilohertz". Empty for no unit. */
export function getUnitString(unit: FCUnit | undefined): string {
  if (!unit || unit.name == fcUnitNames.NONE) {
    return "";
  }

  if (
    unit.name == fcUnitNames.OTHER ||
    unit.name == fcUnitNames.RATIO ||
    !unit.exponent
  ) {
    return unit.name;
  } else if (unit.exponent in SI_PREFIXES) {
    return `${SI_PREFIXES[unit.exponent]}${unit.name}`;
  } else {
    return `${unit.name} * 10^${unit.exponent}`;
  }
}

/**
 * How far one step of a slider moves across a range. Only applies to the slider
 * - a parameter can be set to any value in its range.
 */
export function getSliderStepSize(min: number, max: number): number {
  // Default 1, but ensure at least 50 steps
  let stepSize = 1;
  if (min >= max) {
    return stepSize;
  }
  while ((max - min) / stepSize < 50) {
    stepSize /= 10;
  }
  return stepSize;
}

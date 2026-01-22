// Renders a text summary of a mapping.

import { DmxMappingRange } from "app/persistentState";
import {
  calculateTotalDuration,
  EffectiveEnumChoice,
  formatBoundValue,
  formatDuration,
  formatEnumBoundValue,
} from "./mappingUtils";

export interface MappingRangeTextProps {
  range: DmxMappingRange;
  enumChoices?: EffectiveEnumChoice[];
}

export const MappingRangeText = ({
  range,
  enumChoices,
}: MappingRangeTextProps) => {
  // Use enum formatting if enum choices are provided, otherwise use standard formatting
  const formatValue = (value: number | boolean | undefined): string => {
    if (enumChoices && enumChoices.length > 0) {
      return formatEnumBoundValue(value, enumChoices);
    }
    return formatBoundValue(value);
  };

  const start = formatValue(range.start);
  const end = formatValue(range.end);
  const paramRangeText =
    range.end === undefined || range.start === range.end
      ? start
      : `${start} → ${end}`;
  const spanClasses = "flex-1 text-sm";

  if (range.chunkValues.type === "range") {
    const dmxRangeText = `${range.chunkValues.chunkStart} → ${range.chunkValues.chunkEnd}`;
    return (
      <span className={spanClasses}>
        Parameter range <strong>{paramRangeText}</strong> maps to DMX range{" "}
        <strong>{dmxRangeText}</strong>
      </span>
    );
  } else {
    const stepCount = range.chunkValues.steps.length;
    const stepCountText = `${stepCount} step${stepCount !== 1 ? "s" : ""}`;
    const duration = calculateTotalDuration(range.chunkValues.steps);
    const durationText =
      duration === "indefinite"
        ? "indefinite length"
        : `length ${formatDuration(duration)}`;

    return (
      <span className={spanClasses}>
        Parameter range <strong>{paramRangeText}</strong> triggers a sequence
        with <strong>{stepCountText}</strong> and{" "}
        <strong>{durationText}</strong>
      </span>
    );
  }
};

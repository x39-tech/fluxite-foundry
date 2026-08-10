// Renders a text summary of a mapping.

import { Plural, Trans } from "@lingui/react/macro";
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
      : `${start} \u2192 ${end}`;
  const spanClasses = "flex-1 text-sm";

  if (range.chunkValues.type === "range") {
    const dmxRangeText = `${range.chunkValues.chunkStart} \u2192 ${range.chunkValues.chunkEnd}`;
    return (
      <span className={spanClasses}>
        <Trans id="deviceClassEditor.mappingRangeText.range">
          Parameter range <strong>{paramRangeText}</strong> maps to DMX range{" "}
          <strong>{dmxRangeText}</strong>
        </Trans>
      </span>
    );
  }

  const stepCount = range.chunkValues.steps.length;
  const duration = calculateTotalDuration(range.chunkValues.steps);

  if (duration === "indefinite") {
    return (
      <span className={spanClasses}>
        <Trans id="deviceClassEditor.mappingRangeText.sequence.indefinite">
          Parameter range <strong>{paramRangeText}</strong> triggers a sequence
          with{" "}
          <strong>
            <Plural value={stepCount} one="# step" other="# steps" />
          </strong>{" "}
          and <strong>indefinite length</strong>
        </Trans>
      </span>
    );
  }

  const durationText = formatDuration(duration);

  return (
    <span className={spanClasses}>
      <Trans id="deviceClassEditor.mappingRangeText.sequence.timed">
        Parameter range <strong>{paramRangeText}</strong> triggers a sequence
        with{" "}
        <strong>
          <Plural value={stepCount} one="# step" other="# steps" />
        </strong>{" "}
        and <strong>length {durationText}</strong>
      </Trans>
    </span>
  );
};

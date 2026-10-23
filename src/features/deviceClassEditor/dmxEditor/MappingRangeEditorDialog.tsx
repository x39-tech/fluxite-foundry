import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import {
  DmxMappingRange,
  DmxSequenceStep,
  DmxMappingBound,
} from "app/persistentState";
import { Button } from "components/scn-ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { Input } from "components/scn-ui/Input";
import { IntegerInput } from "components/IntegerInput";
import { Label } from "components/scn-ui/Label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import { SequenceStepEditor } from "./SequenceStepEditor";
import {
  BoundValue,
  boundsEnd,
  boundsStart,
  EffectiveEnumChoice,
  formatEnumBoundValue,
  getEffectiveEnd,
  normalizeEndValue,
  toBounds,
  validateSequenceSteps,
} from "./mappingUtils";
import { MappableDataType } from "./state";

type OutputMode = "range" | "sequence";

const MESSAGES = {
  discardStepsConfirm: msg({
    id: "deviceClassEditor.dmxMappingRange.discardStepsConfirm",
    message: "Switching to Range mode will discard sequence steps. Continue?",
  }),
  save: msg({ id: "deviceClassEditor.dmxMappingRange.save", message: "Save" }),
  cancel: msg({
    id: "deviceClassEditor.dmxMappingRange.cancel",
    message: "Cancel",
  }),
};

interface MappingRangeEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  range: DmxMappingRange;
  onSave: (range: DmxMappingRange) => void;
  dataType: MappableDataType;
  enumChoices?: EffectiveEnumChoice[];
}

export const MappingRangeEditorDialog = ({
  isOpen,
  onClose,
  range,
  onSave,
  dataType,
  enumChoices,
}: MappingRangeEditorDialogProps) => {
  const { _ } = useLingui();

  // Parameter value bounds
  const [start, setStart] = useState<BoundValue>(boundsStart(range.bounds));
  const [end, setEnd] = useState<DmxMappingBound | undefined>(
    boundsEnd(range.bounds),
  );

  // Output mode and values
  const [mode, setMode] = useState<OutputMode>("range");
  const [chunkStart, setChunkStart] = useState(0);
  const [chunkEnd, setChunkEnd] = useState(255);
  const [steps, setSteps] = useState<DmxSequenceStep[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStart(boundsStart(range.bounds));
      setEnd(boundsEnd(range.bounds));

      if (range.chunkValues.type === "range") {
        setMode("range");
        setChunkStart(range.chunkValues.chunkStart);
        setChunkEnd(range.chunkValues.chunkEnd);
        setSteps([]);
      } else {
        setMode("sequence");
        setSteps([...range.chunkValues.steps]);
        setChunkStart(0);
        setChunkEnd(255);
      }
    }
  }, [isOpen, range]);

  const sequenceValidation = validateSequenceSteps(steps);
  const canSave = mode === "range" || sequenceValidation.isValid;

  const handleModeChange = (newMode: OutputMode) => {
    if (mode === "sequence" && newMode === "range" && steps.length > 0) {
      if (!window.confirm(_(MESSAGES.discardStepsConfirm))) {
        return;
      }
    }
    setMode(newMode);
  };

  const handleSave = () => {
    const newRange: DmxMappingRange = {
      bounds: toBounds(start, end),
      chunkValues:
        mode === "range"
          ? { type: "range", chunkStart, chunkEnd }
          : { type: "sequence", steps },
    };
    onSave(newRange);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <Trans id="deviceClassEditor.dmxMappingRange.editMappingRange">
              Edit Mapping Range
            </Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="deviceClassEditor.dmxMappingRange.configureHowParameterValuesMapToDmxOutputValues">
              Configure how parameter values map to DMX output values
            </Trans>
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Parameter Value Bounds */}
          <div className="flex flex-col gap-2">
            <Label className="font-semibold">
              <Trans id="deviceClassEditor.dmxMappingRange.parameterValueRange">
                Parameter Value Range
              </Trans>
            </Label>
            <div className="flex items-center gap-4">
              {dataType === "boolean" && (
                <BooleanBoundInputs
                  start={start}
                  end={end}
                  onStartChange={setStart}
                  onEndChange={setEnd}
                />
              )}
              {dataType === "enum" && enumChoices && (
                <EnumBoundInputs
                  start={start}
                  end={end}
                  onStartChange={setStart}
                  onEndChange={setEnd}
                  choices={enumChoices}
                />
              )}
              {dataType === "number" && (
                <NumericBoundInputs
                  start={start}
                  end={end}
                  onStartChange={setStart}
                  onEndChange={setEnd}
                />
              )}
            </div>
          </div>

          {/* Output Mode Selector */}
          <div className="flex flex-col gap-2">
            <Label className="font-semibold">
              <Trans id="deviceClassEditor.dmxMappingRange.outputMode">
                Output Mode
              </Trans>
            </Label>
            <Select value={mode} onValueChange={handleModeChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="range">
                  <Trans id="deviceClassEditor.dmxMappingRange.range">
                    Range
                  </Trans>
                </SelectItem>
                <SelectItem value="sequence">
                  <Trans id="deviceClassEditor.dmxMappingRange.sequence">
                    Sequence
                  </Trans>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode-specific content */}
          {mode === "range" ? (
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">
                <Trans id="deviceClassEditor.dmxMappingRange.dmxOutputRange">
                  DMX Output Range
                </Trans>
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>
                    <Trans id="deviceClassEditor.dmxMappingRange.start">
                      Start:
                    </Trans>
                  </Label>
                  <IntegerInput
                    className="w-24"
                    value={chunkStart}
                    onCommit={setChunkStart}
                    min={0}
                    max={65535}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>
                    <Trans id="deviceClassEditor.dmxMappingRange.end">
                      End:
                    </Trans>
                  </Label>
                  <IntegerInput
                    className="w-24"
                    value={chunkEnd}
                    onCommit={setChunkEnd}
                    min={0}
                    max={65535}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">
                <Trans id="deviceClassEditor.dmxMappingRange.sequenceSteps">
                  Sequence Steps
                </Trans>
              </Label>
              <SequenceStepEditor
                steps={steps}
                onStepsChange={setSteps}
                validation={sequenceValidation}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            aria-label={_(MESSAGES.save)}
            disabled={!canSave}
            onClick={handleSave}
          >
            <CheckIcon />
            <Trans id="deviceClassEditor.dmxMappingRange.save">Save</Trans>
          </Button>
          <Button
            variant="secondary"
            aria-label={_(MESSAGES.cancel)}
            onClick={onClose}
          >
            <Trans id="deviceClassEditor.dmxMappingRange.cancel">Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface NumericBoundInputsProps {
  start: BoundValue;
  end: DmxMappingBound | undefined;
  onStartChange: (value: BoundValue) => void;
  onEndChange: (value: DmxMappingBound | undefined) => void;
}

const NumericBoundInputs = ({
  start,
  end,
  onStartChange,
  onEndChange,
}: NumericBoundInputsProps) => {
  const effectiveEnd = getEffectiveEnd(start, end);

  // Track raw input values to allow typing intermediate states like "0." or "-"
  const [startInput, setStartInput] = useState(
    typeof start === "number" ? start.toString() : "",
  );
  const [endInput, setEndInput] = useState(
    typeof effectiveEnd === "number" ? effectiveEnd.toString() : "",
  );

  // Sync input values when props change from outside
  useEffect(() => {
    setStartInput(typeof start === "number" ? start.toString() : "");
  }, [start]);
  useEffect(() => {
    const newEffectiveEnd = getEffectiveEnd(start, end);
    setEndInput(
      typeof newEffectiveEnd === "number" ? newEffectiveEnd.toString() : "",
    );
  }, [end, start]);

  const parseNumericValue = (val: string): number | null => {
    if (val === "" || val === "-" || val === "." || val === "-.") {
      return null;
    }
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const handleStartChange = (val: string) => {
    // Only allow valid numeric patterns (including intermediate states)
    if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
      setStartInput(val);
      onStartChange(parseNumericValue(val));
    }
  };

  const handleEndChange = (val: string) => {
    if (val === "" || /^-?\d*\.?\d*$/.test(val)) {
      setEndInput(val);
      const parsed = parseNumericValue(val);
      const normalized = normalizeEndValue(start, parsed);
      onEndChange(normalized);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Label>
          <Trans id="deviceClassEditor.dmxMappingRange.start">Start:</Trans>
        </Label>
        <Input
          type="text"
          inputMode="decimal"
          className="w-24"
          placeholder="null"
          value={startInput}
          onChange={(e) => handleStartChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Label>
          <Trans id="deviceClassEditor.dmxMappingRange.end">End:</Trans>
        </Label>
        <Input
          type="text"
          inputMode="decimal"
          className="w-24"
          placeholder="null"
          value={endInput}
          onChange={(e) => handleEndChange(e.target.value)}
        />
      </div>
    </>
  );
};

interface BooleanBoundInputsProps {
  start: BoundValue;
  end: DmxMappingBound | undefined;
  onStartChange: (value: BoundValue) => void;
  onEndChange: (value: DmxMappingBound | undefined) => void;
}

const BooleanBoundInputs = ({
  start,
  end,
  onStartChange,
  onEndChange,
}: BooleanBoundInputsProps) => {
  const effectiveEnd = getEffectiveEnd(start, end);

  const startValue =
    start === null ? "null" : start === true ? "true" : "false";
  const endValue =
    effectiveEnd === null ? "null" : effectiveEnd === true ? "true" : "false";

  const parseBoolean = (val: string): BoundValue => {
    if (val === "null") return null;
    return val === "true";
  };

  const handleEndChange = (val: string) => {
    const parsed = parseBoolean(val);
    const normalized = normalizeEndValue(start, parsed);
    onEndChange(normalized);
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Label>
          <Trans id="deviceClassEditor.dmxMappingRange.start">Start:</Trans>
        </Label>
        <Select
          value={startValue}
          onValueChange={(v) => onStartChange(parseBoolean(v))}
        >
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">false</SelectItem>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="null">null</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label>
          <Trans id="deviceClassEditor.dmxMappingRange.end">End:</Trans>
        </Label>
        <Select value={endValue} onValueChange={handleEndChange}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="false">false</SelectItem>
            <SelectItem value="true">true</SelectItem>
            <SelectItem value="null">null</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

interface EnumBoundInputsProps {
  start: BoundValue;
  end: DmxMappingBound | undefined;
  onStartChange: (value: BoundValue) => void;
  onEndChange: (value: DmxMappingBound | undefined) => void;
  choices: EffectiveEnumChoice[];
}

const EnumBoundInputs = ({
  start,
  end,
  onStartChange,
  onEndChange,
  choices,
}: EnumBoundInputsProps) => {
  const effectiveEnd = getEffectiveEnd(start, end);
  const startInfo = getBoundRenderInfo(start, choices);
  const endInfo = getBoundRenderInfo(effectiveEnd, choices);

  const parseEnumValue = (val: string): BoundValue => {
    if (val === "null") return null;
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? null : parsed;
  };

  const handleEndChange = (val: string) => {
    const parsed = parseEnumValue(val);
    const normalized = normalizeEndValue(start, parsed);
    onEndChange(normalized);
  };

  // Format choice label: "Name (index)"
  const formatChoice = (choice: EffectiveEnumChoice): string =>
    formatEnumBoundValue(choice.index, choices);

  return (
    <>
      <div className="flex items-center gap-2">
        <Label>
          <Trans id="deviceClassEditor.dmxMappingRange.start">Start:</Trans>
        </Label>
        <Select
          value={startInfo.selectValue}
          onValueChange={(v) => onStartChange(parseEnumValue(v))}
        >
          <SelectTrigger className={`w-40 ${startInfo.borderClass}`}>
            <SelectValue placeholder={startInfo.placeholderText} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem key={choice.index} value={choice.index.toString()}>
                {formatChoice(choice)}
              </SelectItem>
            ))}
            <SelectItem value="null">null</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <Label>
          <Trans id="deviceClassEditor.dmxMappingRange.end">End:</Trans>
        </Label>
        <Select value={endInfo.selectValue} onValueChange={handleEndChange}>
          <SelectTrigger className={`w-40 ${endInfo.borderClass}`}>
            <SelectValue placeholder={endInfo.placeholderText} />
          </SelectTrigger>
          <SelectContent>
            {choices.map((choice) => (
              <SelectItem key={choice.index} value={choice.index.toString()}>
                {formatChoice(choice)}
              </SelectItem>
            ))}
            <SelectItem value="null">null</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </>
  );
};

const invalidBorderClass = "border-orange-500 dark:border-orange-400";

interface BoundRenderInfo {
  selectValue: string;
  borderClass: string;
  placeholderText: string | undefined;
}

function getBoundRenderInfo(
  val: BoundValue,
  choices: EffectiveEnumChoice[],
): BoundRenderInfo {
  if (val === null) {
    return {
      selectValue: "null",
      borderClass: "",
      placeholderText: undefined,
    };
  }

  if (
    typeof val !== "number" ||
    !Number.isInteger(val) ||
    !choices.some((c) => c.index === val)
  ) {
    return {
      selectValue: "",
      borderClass: invalidBorderClass,
      placeholderText: formatEnumBoundValue(val, choices),
    };
  }

  return {
    selectValue: val.toString(),
    borderClass: "",
    placeholderText: undefined,
  };
}

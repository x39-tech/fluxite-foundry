import { useEffect, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import {
  DmxMappingRange,
  DmxSequenceStep,
  DmxMappingBound,
} from "app/persistentState";
import { Button } from "components/scn-ui/Button";
import {
  Dialog,
  DialogContent,
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
import { validateSequenceSteps } from "./mappingUtils";

type OutputMode = "range" | "sequence";

interface MappingRangeEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  range: DmxMappingRange;
  onSave: (range: DmxMappingRange) => void;
  isBoolean: boolean;
}

export const MappingRangeEditorDialog = ({
  isOpen,
  onClose,
  range,
  onSave,
  isBoolean,
}: MappingRangeEditorDialogProps) => {
  // Parameter value bounds
  const [start, setStart] = useState<DmxMappingBound | undefined>(range.start);
  const [end, setEnd] = useState<DmxMappingBound | undefined>(range.end);

  // Output mode and values
  const [mode, setMode] = useState<OutputMode>("range");
  const [chunkStart, setChunkStart] = useState(0);
  const [chunkEnd, setChunkEnd] = useState(255);
  const [steps, setSteps] = useState<DmxSequenceStep[]>([]);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStart(range.start);
      setEnd(range.end);

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
      if (
        !window.confirm(
          "Switching to Range mode will discard sequence steps. Continue?",
        )
      ) {
        return;
      }
    }
    setMode(newMode);
  };

  const handleSave = () => {
    const newRange: DmxMappingRange = {
      start,
      end,
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
          <DialogTitle>Edit Mapping Range</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Parameter Value Bounds */}
          <div className="flex flex-col gap-2">
            <Label className="font-semibold">Parameter Value Range</Label>
            <div className="flex items-center gap-4">
              {isBoolean ? (
                <BooleanBoundInputs
                  start={start}
                  end={end}
                  onStartChange={setStart}
                  onEndChange={setEnd}
                />
              ) : (
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
            <Label className="font-semibold">Output Mode</Label>
            <Select value={mode} onValueChange={handleModeChange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="range">Range</SelectItem>
                <SelectItem value="sequence">Sequence</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Mode-specific content */}
          {mode === "range" ? (
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">DMX Output Range</Label>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label>Start:</Label>
                  <IntegerInput
                    className="w-24"
                    value={chunkStart}
                    onValueChange={(val) => setChunkStart(val ?? 0)}
                    min={0}
                    max={65535}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>End:</Label>
                  <IntegerInput
                    className="w-24"
                    value={chunkEnd}
                    onValueChange={(val) => setChunkEnd(val ?? 255)}
                    min={0}
                    max={65535}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Label className="font-semibold">Sequence Steps</Label>
              <SequenceStepEditor
                steps={steps}
                onStepsChange={setSteps}
                validation={sequenceValidation}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button aria-label="Save" disabled={!canSave} onClick={handleSave}>
            <CheckIcon />
            Save
          </Button>
          <Button variant="secondary" aria-label="Cancel" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface NumericBoundInputsProps {
  start: DmxMappingBound | undefined;
  end: DmxMappingBound | undefined;
  onStartChange: (value: DmxMappingBound | undefined) => void;
  onEndChange: (value: DmxMappingBound | undefined) => void;
}

const NumericBoundInputs = ({
  start,
  end,
  onStartChange,
  onEndChange,
}: NumericBoundInputsProps) => {
  // Track raw input values to allow typing intermediate states like "0." or "-"
  const [startInput, setStartInput] = useState(
    typeof start === "number" ? start.toString() : "",
  );
  const [endInput, setEndInput] = useState(
    typeof end === "number" ? end.toString() : "",
  );

  // Sync input values when props change from outside
  useEffect(() => {
    setStartInput(typeof start === "number" ? start.toString() : "");
  }, [start]);
  useEffect(() => {
    setEndInput(typeof end === "number" ? end.toString() : "");
  }, [end]);

  const parseNumericValue = (val: string): number | undefined => {
    if (val === "" || val === "-" || val === "." || val === "-.") {
      return undefined;
    }
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
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
      onEndChange(parseNumericValue(val));
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Label>Start:</Label>
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
        <Label>End:</Label>
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
  start: DmxMappingBound | undefined;
  end: DmxMappingBound | undefined;
  onStartChange: (value: DmxMappingBound | undefined) => void;
  onEndChange: (value: DmxMappingBound | undefined) => void;
}

const BooleanBoundInputs = ({
  start,
  end,
  onStartChange,
  onEndChange,
}: BooleanBoundInputsProps) => {
  const startValue =
    start === undefined ? "null" : start === true ? "true" : "false";
  const endValue = end === undefined ? "null" : end === true ? "true" : "false";

  const parseBoolean = (val: string): DmxMappingBound | undefined => {
    if (val === "null") return undefined;
    return val === "true";
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Label>Start:</Label>
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
        <Label>End:</Label>
        <Select
          value={endValue}
          onValueChange={(v) => onEndChange(parseBoolean(v))}
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
    </>
  );
};

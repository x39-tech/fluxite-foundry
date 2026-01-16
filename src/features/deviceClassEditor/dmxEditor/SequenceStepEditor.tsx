import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { ExclamationTriangleIcon, TrashIcon } from "@heroicons/react/24/solid";
import { DmxSequenceStep } from "app/persistentState";
import { IntegerInput } from "components/IntegerInput";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import { SmallIconButton } from "components/SmallIconButton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import {
  SequenceValidationResult,
  calculateTotalDuration,
  formatDuration,
  getHoldMilliseconds,
  createHoldValue,
} from "./mappingUtils";
import { Separator } from "components/scn-ui/Separator";

interface SequenceStepEditorProps {
  steps: DmxSequenceStep[];
  onStepsChange: (steps: DmxSequenceStep[]) => void;
  validation: SequenceValidationResult;
}

export const SequenceStepEditor = ({
  steps,
  onStepsChange,
  validation,
}: SequenceStepEditorProps) => {
  const handleAddStep = () => {
    onStepsChange([
      ...steps,
      {
        chunkStart: 0,
        chunkEnd: 255,
        hold: { milliseconds: 1000 },
      },
    ]);
  };

  const handleRemoveStep = (index: number) => {
    onStepsChange([...steps.slice(0, index), ...steps.slice(index + 1)]);
  };

  const handleUpdateStep = (index: number, updatedStep: DmxSequenceStep) => {
    onStepsChange([
      ...steps.slice(0, index),
      updatedStep,
      ...steps.slice(index + 1),
    ]);
  };

  const totalDuration = calculateTotalDuration(steps);

  const hasWarningForStep = (index: number) => {
    return validation.warnings.some((w) => w.stepIndex === index);
  };

  const getWarningMessageForStep = (index: number) => {
    const warning = validation.warnings.find((w) => w.stepIndex === index);
    return warning?.message;
  };

  return (
    <div className="flex flex-col gap-2">
      {steps.length === 0 ? (
        <div className="text-sm text-destructive">
          Sequence must have at least one step
        </div>
      ) : (
        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {steps.map((step, index) => (
            <StepCard
              key={index}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
              hasWarning={hasWarningForStep(index)}
              warningMessage={getWarningMessageForStep(index)}
              onUpdate={(updatedStep) => handleUpdateStep(index, updatedStep)}
              onRemove={() => handleRemoveStep(index)}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <Tooltip>
          <TooltipTrigger asChild>
            <SmallIconButton className="size-7" onClick={handleAddStep}>
              <PlusCircleIcon className="size-5" />
            </SmallIconButton>
          </TooltipTrigger>
          <TooltipContent>Add Step</TooltipContent>
        </Tooltip>

        <div className="text-sm text-muted-foreground">
          Total: {formatDuration(totalDuration)}
        </div>
      </div>
    </div>
  );
};

interface StepCardProps {
  step: DmxSequenceStep;
  index: number;
  isLast: boolean;
  hasWarning: boolean;
  warningMessage?: string;
  onUpdate: (step: DmxSequenceStep) => void;
  onRemove: () => void;
}

const StepCard = ({
  step,
  index,
  isLast,
  hasWarning,
  warningMessage,
  onUpdate,
  onRemove,
}: StepCardProps) => {
  const holdMs = getHoldMilliseconds(step.hold);
  const isIndefinite = step.hold === "indefinite";

  const handleChunkStartChange = (value: number | null) => {
    onUpdate({ ...step, chunkStart: value ?? 0 });
  };

  const handleChunkEndChange = (value: number | null) => {
    onUpdate({ ...step, chunkEnd: value ?? 0 });
  };

  const handleHoldTypeChange = (value: string) => {
    if (value === "indefinite") {
      onUpdate({ ...step, hold: "indefinite" });
    } else {
      onUpdate({ ...step, hold: { milliseconds: holdMs ?? 1000 } });
    }
  };

  const handleHoldMsChange = (value: number | null) => {
    if (value !== null && value >= 0) {
      onUpdate({ ...step, hold: createHoldValue(value) });
    }
  };

  return (
    <div className="flex flex-row items-stretch rounded border border-border bg-card">
      <div className="flex h-full items-center justify-center text-center">
        <span className="px-1 text-sm font-medium text-muted-foreground">
          {index + 1}
        </span>
      </div>
      <Separator orientation="vertical" />
      <div className="flex flex-1 flex-col gap-2 p-2">
        {/* DMX Range Row */}
        <div className="flex items-center gap-2">
          <span className="w-10 text-sm text-muted-foreground">DMX:</span>
          <IntegerInput
            className="w-28"
            value={step.chunkStart}
            onValueChange={handleChunkStartChange}
            min={0}
            max={4294967295}
          />
          <span className="text-muted-foreground">→</span>
          <IntegerInput
            className="w-28"
            value={step.chunkEnd}
            onValueChange={handleChunkEndChange}
            min={0}
            max={4294967295}
          />
        </div>

        {/* Hold Row */}
        <div className="flex items-center gap-2">
          <span className="w-10 text-sm text-muted-foreground">Hold:</span>
          <Select
            value={isIndefinite ? "indefinite" : "ms"}
            onValueChange={handleHoldTypeChange}
          >
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ms">Duration</SelectItem>
              <SelectItem value="indefinite" disabled={!isLast}>
                Indefinite
              </SelectItem>
            </SelectContent>
          </Select>
          {!isIndefinite && (
            <>
              <IntegerInput
                className="w-28"
                value={holdMs ?? 0}
                onValueChange={handleHoldMsChange}
                min={0}
              />
              <span className="text-sm text-muted-foreground">ms</span>
            </>
          )}
          <div className="flex-1" />
          {hasWarning && (
            <Tooltip>
              <TooltipTrigger asChild>
                <ExclamationTriangleIcon className="size-5 text-yellow-500" />
              </TooltipTrigger>
              <TooltipContent>{warningMessage}</TooltipContent>
            </Tooltip>
          )}
          <SmallIconButton onClick={onRemove}>
            <TrashIcon />
          </SmallIconButton>
        </div>
      </div>
    </div>
  );
};

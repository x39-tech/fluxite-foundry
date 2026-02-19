import { useState, useEffect } from "react";
import { Button } from "components/scn-ui/Button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "components/scn-ui/Popover";
import type {
  ChunkSequenceState,
  ChunkKey,
} from "./sequenceManager/sequenceTypes";
import { getHoldDuration } from "./sequenceManager/useDmxSequenceManager";

interface ActiveSequencesButtonProps {
  chunkStates: Map<ChunkKey, ChunkSequenceState>;
  hasActiveSequences: boolean;
}

interface SequenceDisplayInfo {
  chunkOffsets: number[];
  currentStep: number;
  totalSteps: number;
  stepsRemaining: number;
  timeRemaining: number | null;
  queuedCount: number;
}

function formatTimeRemaining(ms: number | null): string {
  if (ms === null) {
    return "Indefinite";
  }
  if (ms < 1000) {
    return `${Math.ceil(ms)}ms`;
  }
  return `${(ms / 1000).toFixed(1)}s`;
}

function getSequenceDisplayInfo(
  chunkState: ChunkSequenceState,
  currentTime: number,
): SequenceDisplayInfo | null {
  if (!chunkState.activeSequence) {
    return null;
  }

  const { activeSequence } = chunkState;
  const { currentStep, sequence } = activeSequence;
  const totalSteps = sequence.steps.length;
  const stepsRemaining = totalSteps - currentStep.stepIndex - 1;

  let timeRemaining: number | null = null;
  const holdDuration = getHoldDuration(currentStep.step.hold);
  if (holdDuration !== null) {
    const elapsed = currentTime - currentStep.startTime;
    timeRemaining = Math.max(0, holdDuration - elapsed);
  }

  return {
    chunkOffsets: [...chunkState.chunk.offsets].sort((a, b) => a - b),
    currentStep: currentStep.stepIndex + 1,
    totalSteps,
    stepsRemaining,
    timeRemaining,
    queuedCount: chunkState.queuedSequences.length,
  };
}

export const ActiveSequencesButton = ({
  chunkStates,
  hasActiveSequences,
}: ActiveSequencesButtonProps) => {
  const [currentTime, setCurrentTime] = useState(() => performance.now());
  const [isOpen, setIsOpen] = useState(false);

  // Update time display when popover is open
  useEffect(() => {
    if (!isOpen || !hasActiveSequences) {
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentTime(performance.now());
    }, 100);

    return () => clearInterval(intervalId);
  }, [isOpen, hasActiveSequences]);

  const activeChunks: SequenceDisplayInfo[] = [];
  for (const chunkState of chunkStates.values()) {
    const info = getSequenceDisplayInfo(chunkState, currentTime);
    if (info) {
      activeChunks.push(info);
    }
  }

  // Sort by first offset
  activeChunks.sort((a, b) => a.chunkOffsets[0] - b.chunkOffsets[0]);

  const activeCount = activeChunks.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={activeCount > 0 ? "text-orange-500" : ""}
        >
          Active Sequences: {activeCount}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-4">
          <h4 className="font-medium">Active Sequences</h4>
          {activeChunks.length === 0 ? (
            <p className="text-sm text-gray-500">No active sequences</p>
          ) : (
            <div className="space-y-3">
              {activeChunks.map((info, index) => (
                <div
                  key={index}
                  className="border rounded-md p-2 text-sm space-y-1"
                >
                  <div className="font-medium">
                    Slots: {info.chunkOffsets.join(", ")}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Step {info.currentStep} of {info.totalSteps}
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    {info.stepsRemaining} step
                    {info.stepsRemaining !== 1 ? "s" : ""} remaining
                  </div>
                  <div className="text-gray-600 dark:text-gray-400">
                    Time: {formatTimeRemaining(info.timeRemaining)}
                  </div>
                  {info.queuedCount > 0 && (
                    <div className="text-orange-600 dark:text-orange-400">
                      {info.queuedCount} sequence
                      {info.queuedCount !== 1 ? "s" : ""} queued
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

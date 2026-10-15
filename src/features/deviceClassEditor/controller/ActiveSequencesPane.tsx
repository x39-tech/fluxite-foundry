import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Plural, Trans } from "@lingui/react/macro";
import { useEffect, useId, useState } from "react";
import { cn } from "utils/utils";
import type {
  ChunkSequenceState,
  ChunkKey,
} from "./sequenceManager/sequenceTypes";
import { getHoldDuration } from "./sequenceManager/useDmxSequenceManager";

interface ActiveSequencesPaneProps {
  className?: string;
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

const MESSAGES = {
  indefinite: msg({
    id: "deviceClassEditor.activeSequences.indefinite",
    message: "Indefinite",
  }),
  milliseconds: msg({
    id: "deviceClassEditor.activeSequences.milliseconds",
    message: "{value}ms",
  }),
  seconds: msg({
    id: "deviceClassEditor.activeSequences.seconds",
    message: "{value}s",
  }),
};

function formatTimeRemaining(ms: number | null): string {
  if (ms === null) {
    return i18n._(MESSAGES.indefinite);
  }
  if (ms < 1000) {
    return i18n._({
      ...MESSAGES.milliseconds,
      values: { value: Math.ceil(ms) },
    });
  }
  return i18n._({
    ...MESSAGES.seconds,
    values: { value: (ms / 1000).toFixed(1) },
  });
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

/**
 * Lists the DMX sequences that are playing.
 */
export const ActiveSequencesPane = ({
  chunkStates,
  hasActiveSequences,
  className,
}: ActiveSequencesPaneProps) => {
  const headingId = useId();
  const [currentTime, setCurrentTime] = useState(() => performance.now());

  // Keep the time remaining counting down while anything is playing.
  useEffect(() => {
    if (!hasActiveSequences) {
      return;
    }

    const intervalId = setInterval(() => {
      setCurrentTime(performance.now());
    }, 100);

    return () => clearInterval(intervalId);
  }, [hasActiveSequences]);

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
    <section
      aria-labelledby={headingId}
      className={cn("flex min-h-0 flex-col gap-2", className)}
    >
      <h3 id={headingId} className="text-sm font-medium">
        <Trans id="deviceClassEditor.activeSequences.heading">
          Active Sequences: {activeCount}
        </Trans>
      </h3>
      {activeChunks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Trans id="deviceClassEditor.activeSequences.none">
            No active sequences
          </Trans>
        </p>
      ) : (
        <ul className="flex min-h-0 flex-col gap-2 overflow-auto">
          {activeChunks.map((info, index) => {
            const slotList = info.chunkOffsets.join(", ");
            const stepNumber = info.currentStep;
            const stepTotal = info.totalSteps;
            const timeRemaining = formatTimeRemaining(info.timeRemaining);

            return (
              <li
                key={index}
                className="border rounded-md p-2 text-sm space-y-1"
              >
                <div className="font-medium">
                  <Trans id="deviceClassEditor.activeSequences.slots">
                    Slots: {slotList}
                  </Trans>
                </div>
                <div className="text-muted-foreground">
                  <Trans id="deviceClassEditor.activeSequences.stepProgress">
                    Step {stepNumber} of {stepTotal}
                  </Trans>
                </div>
                <div className="text-muted-foreground">
                  <Plural
                    id="deviceClassEditor.activeSequences.stepsRemaining"
                    value={info.stepsRemaining}
                    one="# step remaining"
                    other="# steps remaining"
                  />
                </div>
                <div className="text-muted-foreground">
                  <Trans id="deviceClassEditor.activeSequences.timeRemaining">
                    Time: {timeRemaining}
                  </Trans>
                </div>
                {info.queuedCount > 0 && (
                  <div className="text-orange-600 dark:text-orange-400">
                    <Plural
                      id="deviceClassEditor.activeSequences.queuedCount"
                      value={info.queuedCount}
                      one="# sequence queued"
                      other="# sequences queued"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

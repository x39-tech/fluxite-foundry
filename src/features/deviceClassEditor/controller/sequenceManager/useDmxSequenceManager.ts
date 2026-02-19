import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { QueuedSequence } from "@cpwg-community/delver";
import type {
  ChunkKey,
  ChunkSequenceState,
  ActiveSequenceState,
  SequenceManagerResult,
} from "./sequenceTypes";
import { getChunkKey } from "./sequenceTypes";
import {
  calculateStepValue,
  isStepComplete,
  applySequencesToDmx,
  getActiveSlots,
  getHoldDuration,
} from "./sequenceUtils";

/** Delay in ms before transitioning from indefinite hold to next sequence */
const INDEFINITE_TRANSITION_DELAY_MS = 50;

/**
 * Creates the initial active sequence state for a newly started sequence.
 */
function createActiveSequenceState(
  sequence: QueuedSequence,
  startTime: number,
): ActiveSequenceState {
  const firstStep = sequence.steps[0];
  const isIndefinite = firstStep.hold === "indefinite";

  return {
    sequence,
    currentStep: {
      step: firstStep,
      stepIndex: 0,
      startTime,
      currentValue: calculateStepValue(firstStep),
    },
    isIndefinite,
    transitioningToNext: false,
    transitionStartTime: null,
  };
}

/**
 * Advances to the next step in a sequence.
 * Returns the updated ActiveSequenceState or null if sequence is complete.
 */
function advanceToNextStep(
  state: ActiveSequenceState,
  currentTime: number,
): ActiveSequenceState | null {
  const nextStepIndex = state.currentStep.stepIndex + 1;
  const steps = state.sequence.steps;

  if (nextStepIndex >= steps.length) {
    return null;
  }

  const nextStep = steps[nextStepIndex];
  const isIndefinite = nextStep.hold === "indefinite";

  return {
    ...state,
    currentStep: {
      step: nextStep,
      stepIndex: nextStepIndex,
      startTime: currentTime,
      currentValue: calculateStepValue(nextStep),
    },
    isIndefinite,
    transitioningToNext: false,
    transitionStartTime: null,
  };
}

/**
 * Processes a chunk's sequence state for one animation frame.
 * Returns the updated ChunkSequenceState and whether any changes were made.
 */
function processChunkState(
  chunkState: ChunkSequenceState,
  currentTime: number,
): { newState: ChunkSequenceState; changed: boolean } {
  if (!chunkState.activeSequence) {
    // No active sequence, check if we should start one from the queue
    if (chunkState.queuedSequences.length > 0) {
      const [nextSequence, ...remainingQueue] = chunkState.queuedSequences;
      return {
        newState: {
          ...chunkState,
          activeSequence: createActiveSequenceState(nextSequence, currentTime),
          queuedSequences: remainingQueue,
        },
        changed: true,
      };
    }
    return { newState: chunkState, changed: false };
  }

  const active = chunkState.activeSequence;

  // Handle transition from indefinite hold to next sequence
  if (active.transitioningToNext && active.transitionStartTime !== null) {
    const elapsed = currentTime - active.transitionStartTime;
    if (elapsed >= INDEFINITE_TRANSITION_DELAY_MS) {
      // Transition complete, start next sequence or end
      if (chunkState.queuedSequences.length > 0) {
        const [nextSequence, ...remainingQueue] = chunkState.queuedSequences;
        return {
          newState: {
            ...chunkState,
            activeSequence: createActiveSequenceState(
              nextSequence,
              currentTime,
            ),
            queuedSequences: remainingQueue,
          },
          changed: true,
        };
      }
      // No next sequence, clear active
      return {
        newState: {
          ...chunkState,
          activeSequence: null,
        },
        changed: true,
      };
    }
    // Still waiting for transition delay
    return { newState: chunkState, changed: false };
  }

  // Handle indefinite hold with queued sequences
  if (active.isIndefinite && chunkState.queuedSequences.length > 0) {
    return {
      newState: {
        ...chunkState,
        activeSequence: {
          ...active,
          transitioningToNext: true,
          transitionStartTime: currentTime,
        },
      },
      changed: true,
    };
  }

  // Check if current step is complete
  if (
    isStepComplete(
      active.currentStep.step,
      active.currentStep.startTime,
      currentTime,
    )
  ) {
    const nextState = advanceToNextStep(active, currentTime);

    if (nextState === null) {
      // Sequence complete
      if (chunkState.queuedSequences.length > 0) {
        // Start next queued sequence
        const [nextSequence, ...remainingQueue] = chunkState.queuedSequences;
        return {
          newState: {
            ...chunkState,
            activeSequence: createActiveSequenceState(
              nextSequence,
              currentTime,
            ),
            queuedSequences: remainingQueue,
          },
          changed: true,
        };
      }
      // No more sequences, return to background value
      return {
        newState: {
          ...chunkState,
          activeSequence: null,
        },
        changed: true,
      };
    }

    return {
      newState: {
        ...chunkState,
        activeSequence: nextState,
      },
      changed: true,
    };
  }

  return { newState: chunkState, changed: false };
}

/**
 * Hook to manage DMX sequence playback.
 *
 * Handles queuing sequences, playing them with proper timing, and overlaying
 * sequence values onto base DMX values.
 */
export function useDmxSequenceManager(): SequenceManagerResult {
  const [chunkStates, setChunkStates] = useState<
    Map<ChunkKey, ChunkSequenceState>
  >(() => new Map());
  const [baseDmxValues, setBaseDmxValues] = useState<Uint8Array>(
    () => new Uint8Array(),
  );
  const animationFrameRef = useRef<number | null>(null);
  const isRunningRef = useRef(false);

  // Animation loop for processing sequences
  const animate = useCallback((currentTime: number) => {
    setChunkStates((prevStates) => {
      let hasChanges = false;
      const newStates = new Map<ChunkKey, ChunkSequenceState>();

      for (const [key, chunkState] of prevStates) {
        const { newState, changed } = processChunkState(
          chunkState,
          currentTime,
        );
        newStates.set(key, newState);
        if (changed) {
          hasChanges = true;
        }
      }

      return hasChanges ? newStates : prevStates;
    });

    // Continue animation loop if there are active sequences
    if (isRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, []);

  // Start/stop animation loop based on whether there are active sequences
  useEffect(() => {
    const hasActive = Array.from(chunkStates.values()).some(
      (state) =>
        state.activeSequence !== null || state.queuedSequences.length > 0,
    );

    if (hasActive && !isRunningRef.current) {
      isRunningRef.current = true;
      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (!hasActive && isRunningRef.current) {
      isRunningRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      isRunningRef.current = false;
    };
  }, [chunkStates, animate]);

  // Queue sequences from driver results
  const queueSequences = useCallback((sequences: QueuedSequence[]) => {
    if (sequences.length === 0) return;

    const currentTime = performance.now();

    setChunkStates((prevStates) => {
      const newStates = new Map(prevStates);

      for (const sequence of sequences) {
        const key = getChunkKey(sequence.chunk);
        const existing = newStates.get(key);

        if (existing) {
          // Add to existing chunk's queue
          if (existing.activeSequence) {
            // Already has an active sequence, add to queue
            newStates.set(key, {
              ...existing,
              queuedSequences: [...existing.queuedSequences, sequence],
            });
          } else {
            // No active sequence, start this one immediately
            newStates.set(key, {
              ...existing,
              activeSequence: createActiveSequenceState(sequence, currentTime),
            });
          }
        } else {
          // Create new chunk state and start sequence immediately
          newStates.set(key, {
            chunk: sequence.chunk,
            backgroundValue: 0,
            activeSequence: createActiveSequenceState(sequence, currentTime),
            queuedSequences: [],
          });
        }
      }

      return newStates;
    });
  }, []);

  // Update base DMX values (from the driver)
  const setBaseDmxValuesAction = useCallback((values: Uint8Array) => {
    setBaseDmxValues(values);
  }, []);

  // Compute derived state
  const hasActiveSequences = Array.from(chunkStates.values()).some(
    (state) => state.activeSequence !== null,
  );
  const activeSlots = getActiveSlots(chunkStates);
  const dmxValues = applySequencesToDmx(baseDmxValues, chunkStates);

  // Memoize actions to prevent unnecessary re-renders in consumers
  const actions = useMemo(
    () => ({
      queueSequences,
      setBaseDmxValues: setBaseDmxValuesAction,
    }),
    [queueSequences, setBaseDmxValuesAction],
  );

  return {
    state: {
      chunkStates,
      hasActiveSequences,
      activeSlots,
    },
    actions,
    dmxValues,
  };
}

export { getHoldDuration };

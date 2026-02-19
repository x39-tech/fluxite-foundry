import type { SequenceStep, DmxChunk, HoldValue } from "@cpwg-community/delver";
import type { ChunkSequenceState, ChunkKey } from "./sequenceTypes";
import { getChunkKey } from "./sequenceTypes";

/**
 * Calculates the DMX value for a step by taking the midpoint of the range.
 */
export function calculateStepValue(step: SequenceStep): number {
  return Math.round((step.chunkStart + step.chunkEnd) / 2);
}

/**
 * Gets the hold duration in milliseconds for a step.
 * Returns null for indefinite holds.
 */
export function getHoldDuration(hold: HoldValue): number | null {
  if (hold === "indefinite") {
    return null;
  }
  return hold.milliseconds;
}

/**
 * Checks if a step's hold duration has elapsed.
 * Indefinite steps never complete by time.
 */
export function isStepComplete(
  step: SequenceStep,
  startTime: number,
  currentTime: number,
): boolean {
  const duration = getHoldDuration(step.hold);
  if (duration === null) {
    return false;
  }
  return currentTime - startTime >= duration;
}

/**
 * Gets the time remaining in a step in milliseconds.
 * Returns null for indefinite holds.
 */
export function getTimeRemaining(
  step: SequenceStep,
  startTime: number,
  currentTime: number,
): number | null {
  const duration = getHoldDuration(step.hold);
  if (duration === null) {
    return null;
  }
  return Math.max(0, duration - (currentTime - startTime));
}

/**
 * Applies sequence overrides to base DMX values.
 * Returns a new Uint8Array with sequence values overlaid.
 */
export function applySequencesToDmx(
  baseDmx: Uint8Array,
  chunkStates: Map<ChunkKey, ChunkSequenceState>,
): Uint8Array {
  const result = new Uint8Array(baseDmx);

  for (const chunkState of chunkStates.values()) {
    if (chunkState.activeSequence) {
      const value = chunkState.activeSequence.currentStep.currentValue;
      const offsets = chunkState.chunk.offsets;
      // Split the value into bytes big-endian across the chunk's offsets.
      // offset[0] gets the most significant byte, offset[N-1] the least.
      for (let i = 0; i < offsets.length; i++) {
        const shift = (offsets.length - 1 - i) * 8;
        if (offsets[i] < result.length) {
          result[offsets[i]] = (value >> shift) & 0xff;
        }
      }
    }
  }

  return result;
}

/**
 * Gets all DMX slot indices that are currently controlled by active sequences.
 */
export function getActiveSlots(
  chunkStates: Map<ChunkKey, ChunkSequenceState>,
): Set<number> {
  const slots = new Set<number>();

  for (const chunkState of chunkStates.values()) {
    if (chunkState.activeSequence) {
      for (const offset of chunkState.chunk.offsets) {
        slots.add(offset);
      }
    }
  }

  return slots;
}

/**
 * Updates the background value for a chunk.
 * If the chunk doesn't exist in the state, it won't be added.
 */
export function updateBackgroundValue(
  chunkStates: Map<ChunkKey, ChunkSequenceState>,
  chunk: DmxChunk,
  value: number,
): Map<ChunkKey, ChunkSequenceState> {
  const key = getChunkKey(chunk);
  const existing = chunkStates.get(key);

  if (!existing) {
    return chunkStates;
  }

  const newStates = new Map(chunkStates);
  newStates.set(key, {
    ...existing,
    backgroundValue: value,
  });

  return newStates;
}

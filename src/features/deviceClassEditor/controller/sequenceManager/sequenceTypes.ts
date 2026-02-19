import type {
  DmxChunk,
  QueuedSequence,
  SequenceStep,
} from "@cpwg-community/delver";

/**
 * A string key for identifying chunks. Since JavaScript Map/Set use reference
 * equality, we serialize chunk offsets to a stable string key.
 */
export type ChunkKey = string;

/**
 * Creates a stable string key from a DmxChunk's offsets.
 * Sorts offsets to ensure consistent keys regardless of order.
 */
export function getChunkKey(chunk: DmxChunk): ChunkKey {
  return JSON.stringify([...chunk.offsets].sort((a, b) => a - b));
}

/**
 * State for the currently active step within a sequence.
 */
export interface ActiveStepState {
  step: SequenceStep;
  stepIndex: number;
  startTime: number;
  currentValue: number;
}

/**
 * State for an actively playing sequence.
 */
export interface ActiveSequenceState {
  sequence: QueuedSequence;
  currentStep: ActiveStepState;
  isIndefinite: boolean;
  transitioningToNext: boolean;
  transitionStartTime: number | null;
}

/**
 * State for a single chunk's sequence queue.
 */
export interface ChunkSequenceState {
  chunk: DmxChunk;
  backgroundValue: number;
  activeSequence: ActiveSequenceState | null;
  queuedSequences: QueuedSequence[];
}

/**
 * The complete state of the sequence manager.
 */
export interface SequenceManagerState {
  chunkStates: Map<ChunkKey, ChunkSequenceState>;
  hasActiveSequences: boolean;
  activeSlots: Set<number>;
}

/**
 * Actions available from the sequence manager.
 */
export interface SequenceManagerActions {
  queueSequences: (sequences: QueuedSequence[]) => void;
  setBaseDmxValues: (values: Uint8Array) => void;
}

/**
 * Return type of the useDmxSequenceManager hook.
 */
export interface SequenceManagerResult {
  state: SequenceManagerState;
  actions: SequenceManagerActions;
  dmxValues: Uint8Array;
}

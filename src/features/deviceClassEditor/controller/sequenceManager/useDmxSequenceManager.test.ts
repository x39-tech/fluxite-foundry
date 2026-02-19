import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useDmxSequenceManager } from "./useDmxSequenceManager";
import type {
  QueuedSequence,
  SequenceStep,
  DmxChunk,
} from "@cpwg-community/delver";

function createChunk(offsets: number[]): DmxChunk {
  return { offsets };
}

function createStep(
  chunkStart: number,
  chunkEnd: number,
  holdMs: number | "indefinite",
): SequenceStep {
  return {
    chunkStart,
    chunkEnd,
    hold: holdMs === "indefinite" ? "indefinite" : { milliseconds: holdMs },
  };
}

function createSequence(
  chunk: DmxChunk,
  steps: SequenceStep[],
): QueuedSequence {
  return { chunk, steps };
}

describe("useDmxSequenceManager", () => {
  let mockTime = 0;
  let rafCallbacks: Array<(time: number) => void> = [];
  let rafId = 0;

  beforeEach(() => {
    mockTime = 0;
    rafCallbacks = [];
    rafId = 0;

    vi.spyOn(performance, "now").mockImplementation(() => mockTime);

    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return ++rafId;
    });

    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
      rafCallbacks = [];
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function advanceTime(ms: number) {
    mockTime += ms;
    const callbacks = [...rafCallbacks];
    rafCallbacks = [];
    callbacks.forEach((cb) => cb(mockTime));
  }

  it("initializes with empty state", () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    expect(result.current.state.hasActiveSequences).toBe(false);
    expect(result.current.state.activeSlots.size).toBe(0);
    expect(result.current.state.chunkStates.size).toBe(0);
  });

  it("starts a sequence immediately when queued", () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    const chunk = createChunk([0, 1]);
    const sequence = createSequence(chunk, [createStep(100, 100, 1000)]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    expect(result.current.state.hasActiveSequences).toBe(true);
    expect(result.current.state.activeSlots.has(0)).toBe(true);
    expect(result.current.state.activeSlots.has(1)).toBe(true);
  });

  it("sets correct DMX value from step midpoint", () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(10));
    });

    const chunk = createChunk([5]);
    const sequence = createSequence(chunk, [createStep(100, 200, 1000)]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    // Midpoint of 100-200 is 150
    expect(result.current.dmxValues[5]).toBe(150);
  });

  it("advances to next step after hold duration", async () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(10));
    });

    const chunk = createChunk([3]);
    const sequence = createSequence(chunk, [
      createStep(50, 50, 100),
      createStep(200, 200, 100),
    ]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    expect(result.current.dmxValues[3]).toBe(50);

    // Advance past first step duration
    act(() => {
      advanceTime(101);
    });

    await waitFor(() => {
      expect(result.current.dmxValues[3]).toBe(200);
    });
  });

  it("returns to background value after sequence completes", async () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    // Set a background value
    const baseDmx = new Uint8Array(10);
    baseDmx[2] = 42;
    act(() => {
      result.current.actions.setBaseDmxValues(baseDmx);
    });

    const chunk = createChunk([2]);
    const sequence = createSequence(chunk, [createStep(100, 100, 50)]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    expect(result.current.dmxValues[2]).toBe(100);

    // Advance past sequence duration
    act(() => {
      advanceTime(51);
    });

    await waitFor(() => {
      expect(result.current.dmxValues[2]).toBe(42);
      expect(result.current.state.hasActiveSequences).toBe(false);
    });
  });

  it("queues second sequence while first is playing", async () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(10));
    });

    const chunk = createChunk([1]);
    const seq1 = createSequence(chunk, [createStep(50, 50, 100)]);
    const seq2 = createSequence(chunk, [createStep(150, 150, 100)]);

    act(() => {
      result.current.actions.queueSequences([seq1]);
    });

    expect(result.current.dmxValues[1]).toBe(50);

    act(() => {
      result.current.actions.queueSequences([seq2]);
    });

    // Should still be on first sequence
    expect(result.current.dmxValues[1]).toBe(50);

    // Advance past first sequence
    act(() => {
      advanceTime(101);
    });

    await waitFor(() => {
      expect(result.current.dmxValues[1]).toBe(150);
    });
  });

  it("handles indefinite hold until next sequence is queued", async () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(10));
    });

    const chunk = createChunk([4]);
    const seq1 = createSequence(chunk, [createStep(80, 80, "indefinite")]);
    const seq2 = createSequence(chunk, [createStep(180, 180, 50)]);

    act(() => {
      result.current.actions.queueSequences([seq1]);
    });

    expect(result.current.dmxValues[4]).toBe(80);
    expect(result.current.state.hasActiveSequences).toBe(true);

    // Advance time without queuing - should stay at 80
    act(() => {
      advanceTime(1000);
    });

    expect(result.current.dmxValues[4]).toBe(80);
    expect(result.current.state.hasActiveSequences).toBe(true);

    // Queue second sequence - should trigger transition
    act(() => {
      result.current.actions.queueSequences([seq2]);
    });

    // Run animation frame to detect indefinite hold with queued sequence
    // This sets transitioningToNext = true
    act(() => {
      advanceTime(1);
    });

    // Should still be at 80 during transition delay
    expect(result.current.dmxValues[4]).toBe(80);

    // Advance past 50ms transition delay
    act(() => {
      advanceTime(51);
    });

    await waitFor(() => {
      expect(result.current.dmxValues[4]).toBe(180);
    });
  });

  it("handles multiple chunks independently", async () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(10));
    });

    const chunk1 = createChunk([0]);
    const chunk2 = createChunk([5]);
    const seq1 = createSequence(chunk1, [createStep(100, 100, 200)]);
    const seq2 = createSequence(chunk2, [createStep(50, 50, 100)]);

    act(() => {
      result.current.actions.queueSequences([seq1, seq2]);
    });

    expect(result.current.dmxValues[0]).toBe(100);
    expect(result.current.dmxValues[5]).toBe(50);

    // Advance past chunk2's sequence
    act(() => {
      advanceTime(101);
    });

    await waitFor(() => {
      // Chunk2 should be back to 0, chunk1 still active
      expect(result.current.dmxValues[0]).toBe(100);
      expect(result.current.dmxValues[5]).toBe(0);
      expect(result.current.state.activeSlots.has(0)).toBe(true);
      expect(result.current.state.activeSlots.has(5)).toBe(false);
    });
  });

  it("overlays sequence values on base DMX values", () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    const baseDmx = new Uint8Array([10, 20, 30, 40, 50]);
    act(() => {
      result.current.actions.setBaseDmxValues(baseDmx);
    });

    const chunk = createChunk([2]);
    const sequence = createSequence(chunk, [createStep(255, 255, 1000)]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    // Slot 2 should be overridden, others unchanged
    expect(result.current.dmxValues[0]).toBe(10);
    expect(result.current.dmxValues[1]).toBe(20);
    expect(result.current.dmxValues[2]).toBe(255);
    expect(result.current.dmxValues[3]).toBe(40);
    expect(result.current.dmxValues[4]).toBe(50);
  });

  it("splits multi-byte chunk values big-endian across offsets", () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(10));
    });

    // 60001 = 0xEA61 → high byte 0xEA (234), low byte 0x61 (97)
    const chunk = createChunk([0, 1]);
    const sequence = createSequence(chunk, [createStep(60001, 60001, 1000)]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    expect(result.current.dmxValues[0]).toBe(0xea); // 234
    expect(result.current.dmxValues[1]).toBe(0x61); // 97
  });

  it("splits three-byte chunk values big-endian across offsets", () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(10));
    });

    // 0x01AB02 = 109314 → bytes: 0x01, 0xAB, 0x02
    const chunk = createChunk([3, 4, 5]);
    const sequence = createSequence(chunk, [createStep(109314, 109314, 1000)]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    expect(result.current.dmxValues[3]).toBe(0x01); // 1
    expect(result.current.dmxValues[4]).toBe(0xab); // 171
    expect(result.current.dmxValues[5]).toBe(0x02); // 2
  });

  it("tracks active slots correctly", () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(20));
    });

    const chunk = createChunk([5, 6, 7, 15]);
    const sequence = createSequence(chunk, [createStep(128, 128, 1000)]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    expect(result.current.state.activeSlots.has(5)).toBe(true);
    expect(result.current.state.activeSlots.has(6)).toBe(true);
    expect(result.current.state.activeSlots.has(7)).toBe(true);
    expect(result.current.state.activeSlots.has(15)).toBe(true);
    expect(result.current.state.activeSlots.has(0)).toBe(false);
    expect(result.current.state.activeSlots.has(8)).toBe(false);
  });

  it("processes multi-step sequences correctly", async () => {
    const { result } = renderHook(() => useDmxSequenceManager());

    act(() => {
      result.current.actions.setBaseDmxValues(new Uint8Array(10));
    });

    const chunk = createChunk([0]);
    const sequence = createSequence(chunk, [
      createStep(10, 10, 50),
      createStep(20, 20, 50),
      createStep(30, 30, 50),
    ]);

    act(() => {
      result.current.actions.queueSequences([sequence]);
    });

    expect(result.current.dmxValues[0]).toBe(10);

    act(() => {
      advanceTime(51);
    });

    await waitFor(() => {
      expect(result.current.dmxValues[0]).toBe(20);
    });

    act(() => {
      advanceTime(51);
    });

    await waitFor(() => {
      expect(result.current.dmxValues[0]).toBe(30);
    });

    act(() => {
      advanceTime(51);
    });

    await waitFor(() => {
      expect(result.current.dmxValues[0]).toBe(0);
      expect(result.current.state.hasActiveSequences).toBe(false);
    });
  });
});

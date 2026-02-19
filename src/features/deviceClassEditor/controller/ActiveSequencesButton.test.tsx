import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActiveSequencesButton } from "./ActiveSequencesButton";
import type {
  ChunkSequenceState,
  ChunkKey,
} from "./sequenceManager/sequenceTypes";
import type {
  DmxChunk,
  QueuedSequence,
  SequenceStep,
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

function createChunkState(
  chunk: DmxChunk,
  stepIndex: number,
  totalSteps: number,
  holdMs: number | "indefinite",
  queuedCount: number = 0,
  startTime: number = 0,
): ChunkSequenceState {
  const steps: SequenceStep[] = [];
  for (let i = 0; i < totalSteps; i++) {
    steps.push(createStep(100, 100, i === stepIndex ? holdMs : 100));
  }

  const sequence = createSequence(chunk, steps);
  const queuedSequences: QueuedSequence[] = [];
  for (let i = 0; i < queuedCount; i++) {
    queuedSequences.push(createSequence(chunk, [createStep(50, 50, 100)]));
  }

  return {
    chunk,
    backgroundValue: 0,
    activeSequence: {
      sequence,
      currentStep: {
        step: steps[stepIndex],
        stepIndex,
        startTime,
        currentValue: 100,
      },
      isIndefinite: holdMs === "indefinite",
      transitioningToNext: false,
      transitionStartTime: null,
    },
    queuedSequences,
  };
}

function getChunkKey(chunk: DmxChunk): ChunkKey {
  return JSON.stringify([...chunk.offsets].sort((a, b) => a - b));
}

describe("ActiveSequencesButton", () => {
  beforeEach(() => {
    vi.spyOn(performance, "now").mockReturnValue(1000);
  });

  it("renders with count 0 when hasActiveSequences is false", () => {
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={false}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Active Sequences: 0" }),
    ).toBeInTheDocument();
  });

  it("renders with active sequence count when hasActiveSequences is true", () => {
    const chunk = createChunk([0, 1]);
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();
    chunkStates.set(getChunkKey(chunk), createChunkState(chunk, 0, 3, 1000));

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={true}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Active Sequences: 1" }),
    ).toBeInTheDocument();
  });

  it("shows popover with sequence details when clicked", async () => {
    const user = userEvent.setup();
    const chunk = createChunk([5, 6]);
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();
    chunkStates.set(getChunkKey(chunk), createChunkState(chunk, 1, 4, 500));

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Active Sequences:/ }));

    // Should show slot numbers
    expect(screen.getByText("Slots: 5, 6")).toBeInTheDocument();

    // Should show step info (1-indexed, so step 2 of 4)
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();

    // Should show steps remaining
    expect(screen.getByText("2 steps remaining")).toBeInTheDocument();
  });

  it("shows indefinite for indefinite hold steps", async () => {
    const user = userEvent.setup();
    const chunk = createChunk([3]);
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();
    chunkStates.set(
      getChunkKey(chunk),
      createChunkState(chunk, 0, 2, "indefinite"),
    );

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Active Sequences:/ }));

    expect(screen.getByText("Time: Indefinite")).toBeInTheDocument();
  });

  it("shows queued sequence count", async () => {
    const user = userEvent.setup();
    const chunk = createChunk([0]);
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();
    chunkStates.set(getChunkKey(chunk), createChunkState(chunk, 0, 1, 1000, 3));

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Active Sequences:/ }));

    expect(screen.getByText("3 sequences queued")).toBeInTheDocument();
  });

  it("handles singular form for 1 step remaining", async () => {
    const user = userEvent.setup();
    const chunk = createChunk([0]);
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();
    // Second to last step of 3 steps = 1 step remaining
    chunkStates.set(getChunkKey(chunk), createChunkState(chunk, 1, 3, 1000));

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Active Sequences:/ }));

    expect(screen.getByText("1 step remaining")).toBeInTheDocument();
  });

  it("handles singular form for 1 sequence queued", async () => {
    const user = userEvent.setup();
    const chunk = createChunk([0]);
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();
    chunkStates.set(getChunkKey(chunk), createChunkState(chunk, 0, 1, 1000, 1));

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Active Sequences:/ }));

    expect(screen.getByText("1 sequence queued")).toBeInTheDocument();
  });

  it("shows multiple active sequences sorted by slot offset", async () => {
    const user = userEvent.setup();
    const chunk1 = createChunk([10]);
    const chunk2 = createChunk([5]);
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();
    chunkStates.set(getChunkKey(chunk1), createChunkState(chunk1, 0, 2, 1000));
    chunkStates.set(getChunkKey(chunk2), createChunkState(chunk2, 0, 3, 500));

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Active Sequences:/ }));

    const slots = screen.getAllByText(/^Slots:/);
    expect(slots).toHaveLength(2);
    // Slot 5 should come first (sorted by offset)
    expect(slots[0]).toHaveTextContent("Slots: 5");
    expect(slots[1]).toHaveTextContent("Slots: 10");
  });

  it("does not show queued count when there are no queued sequences", async () => {
    const user = userEvent.setup();
    const chunk = createChunk([0]);
    const chunkStates = new Map<ChunkKey, ChunkSequenceState>();
    chunkStates.set(getChunkKey(chunk), createChunkState(chunk, 0, 1, 1000, 0));

    render(
      <ActiveSequencesButton
        chunkStates={chunkStates}
        hasActiveSequences={true}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Active Sequences:/ }));

    expect(screen.queryByText(/queued/)).not.toBeInTheDocument();
  });
});

// Helpers for parsing DMX slot numbers and converting them between the
// one-based UI format and the zero-based format used in the stored state and in
// Fluxite Codex. One-based slots are only used for display.

import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { DmxSerializer, EntityId } from "app/persistentState";

export const MAX_SLOT_NUMBER = 512;

const FEEDBACK = {
  notASlotNumber: msg({
    id: "deviceClassEditor.dmxChunk.notASlotNumber",
    message: "“{input}” is not a slot number from 1 to {max}",
  }),
  slotInUse: msg({
    id: "deviceClassEditor.dmxChunk.slotInUse",
    message: "Slot {slot} is already used by another slot group",
  }),
};

export function slotNumberFromOffset(offset: number): number {
  return offset + 1;
}

export function offsetFromSlotNumber(slotNumber: number): number {
  return slotNumber - 1;
}

/** Formats zero-based offsets as a list of one-based slot numbers. */
export function formatSlotNumbers(offsets: number[]): string {
  return offsets.map(slotNumberFromOffset).join(", ");
}

export type SlotNumbersResult =
  | { isValid: true; offsets: number[] }
  | { isValid: false; feedback: MessageDescriptor };

/**
 * Converts slot numbers entered for a slot group into the zero-based offsets to
 * store, keeping their order. Rejects anything that isn't a whole slot number
 * in range, or a slot that is in use by another slot group in the serializer.
 */
export function parseSlotNumbers(
  inputs: string[],
  dmx: DmxSerializer,
  chunkId: EntityId,
): SlotNumbersResult {
  const offsets: number[] = [];

  for (const input of inputs) {
    const trimmed = input.trim();
    const slotNumber = /^\d+$/.test(trimmed) ? Number(trimmed) : NaN;
    if (!(slotNumber >= 1 && slotNumber <= MAX_SLOT_NUMBER)) {
      return {
        isValid: false,
        feedback: {
          ...FEEDBACK.notASlotNumber,
          values: { input, max: MAX_SLOT_NUMBER },
        },
      };
    }

    const offset = offsetFromSlotNumber(slotNumber);
    const inUse = Object.entries(dmx.chunks).some(
      ([id, chunk]) => id !== chunkId && chunk.offsets.includes(offset),
    );
    if (inUse) {
      return {
        isValid: false,
        feedback: { ...FEEDBACK.slotInUse, values: { slot: slotNumber } },
      };
    }

    offsets.push(offset);
  }

  return { isValid: true, offsets: [...new Set(offsets)] };
}

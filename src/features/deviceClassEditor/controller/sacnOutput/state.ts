import { EntityId } from "app/persistentState";
import { SacnOutputSettings } from "app/runtimeState";
import { updateAppRuntimeState, useAppRuntimeStore } from "app/store";
import {
  updateEditorRuntimeState,
  useEditorRuntimeField,
} from "../../runtimeState";
import { UNIVERSE_SIZE } from "./native";

export const DEFAULT_SACN_OUTPUT_SETTINGS: SacnOutputSettings = {
  universe: 1,
  startAddress: 1,
};

export function useSacnOutputSettings(
  documentId: EntityId | undefined,
): SacnOutputSettings {
  return (
    useEditorRuntimeField(documentId, "sacnOutputSettings") ??
    DEFAULT_SACN_OUTPUT_SETTINGS
  );
}

export function useSacnOutputActive(documentId: EntityId | undefined): boolean {
  return useAppRuntimeStore(
    (state) =>
      documentId !== undefined &&
      state.sacnOutput.activeDocumentId === documentId,
  );
}

export function updateSacnOutputSettings(
  documentId: EntityId,
  changes: Partial<SacnOutputSettings>,
) {
  updateEditorRuntimeState(documentId, (state) => {
    state.sacnOutputSettings = {
      ...(state.sacnOutputSettings ?? DEFAULT_SACN_OUTPUT_SETTINGS),
      ...changes,
    };
  });
}

/**
 * Turns a document's output on or off. Turning one document's output on turns
 * off any other document's.
 */
export function setSacnOutputActive(documentId: EntityId, active: boolean) {
  updateAppRuntimeState((state) => {
    if (active) {
      state.sacnOutput.activeDocumentId = documentId;
    } else if (state.sacnOutput.activeDocumentId === documentId) {
      state.sacnOutput.activeDocumentId = undefined;
    }
  });
}

/**
 * Places a device's DMX footprint in a full universe, starting at the given
 * 1-based address. Slots that would fall past the end of the universe are
 * dropped.
 */
export function buildUniverseFrame(
  footprint: Uint8Array,
  startAddress: number,
): Uint8Array {
  const frame = new Uint8Array(UNIVERSE_SIZE);
  const offset = startAddress - 1;
  frame.set(footprint.subarray(0, UNIVERSE_SIZE - offset), offset);
  return frame;
}

// sACN-sending side effects driven from the runtime state.

import { isTauri } from "@tauri-apps/api/core";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { isEqual } from "lodash";
import { toast } from "sonner";
import { AppRuntimeState } from "app/runtimeState";
import { updateAppRuntimeState, useAppRuntimeStore } from "app/store";
import { errorMessage } from "utils/utils";
import { startSacnOutput, stopSacnOutput } from "./native";
import { DEFAULT_SACN_OUTPUT_SETTINGS } from "./state";

const MESSAGES = {
  startFailed: msg({
    id: "deviceClassEditor.sacnOutput.startFailed",
    message: "Could not start sACN output: {reason}",
  }),
};

interface OutputTarget {
  interfaceName: string;
  universe: number;
}

// What the state asks for, and what the output was last successfully set to.
let desired: OutputTarget | null = null;
let current: OutputTarget | null = null;
// Calls to the output are made one at a time, in order.
let syncing: Promise<void> = Promise.resolve();

let stopEffects: (() => void) | undefined;

/**
 * Starts keeping the sACN output in step with the state. Does nothing in the
 * browser, which cannot send sACN.
 */
export function initSacnOutputEffects() {
  stopSacnOutputEffects();
  if (!isTauri()) {
    return () => {};
  }

  const unsubscribe = useAppRuntimeStore.subscribe(onRuntimeStateChanged);
  const stop = () => {
    unsubscribe();
    desired = null;
    syncing = syncing.then(sync);
    if (stopEffects === stop) {
      stopEffects = undefined;
    }
  };
  stopEffects = stop;

  onRuntimeStateChanged(useAppRuntimeStore.getState());
}

export function stopSacnOutputEffects() {
  stopEffects?.();
}

/** Resolves once the output has caught up with the state. */
export function sacnOutputSettled(): Promise<void> {
  return syncing;
}

function onRuntimeStateChanged(state: AppRuntimeState) {
  const { activeDocumentId } = state.sacnOutput;

  // A document whose DMX test driver went away, because it closed or no longer
  // maps anything to DMX, has nothing left to send.
  if (activeDocumentId && !(activeDocumentId in state.dmxControllers)) {
    updateAppRuntimeState((state) => {
      state.sacnOutput.activeDocumentId = undefined;
    });
    return;
  }

  const target = targetOf(state);
  if (!isEqual(target, desired)) {
    desired = target;
    syncing = syncing.then(sync);
  }
}

function targetOf(state: AppRuntimeState): OutputTarget | null {
  const { activeDocumentId, settings } = state.sacnOutput;
  if (!activeDocumentId) {
    return null;
  }

  const { interfaceName, universe } =
    settings[activeDocumentId] ?? DEFAULT_SACN_OUTPUT_SETTINGS;
  return interfaceName ? { interfaceName, universe } : null;
}

async function sync() {
  const target = desired;
  if (isEqual(target, current)) {
    return;
  }

  try {
    if (target) {
      await startSacnOutput(target.interfaceName, target.universe);
    } else {
      await stopSacnOutput();
    }
    current = target;
  } catch (error) {
    // A failed start leaves the output stopped.
    current = null;
    toast.error(
      i18n._({
        ...MESSAGES.startFailed,
        values: { reason: errorMessage(error) },
      }),
    );
    // Turn the output off so the controls show that it is not transmitting,
    // unless the state has already moved on to something else to try.
    if (isEqual(desired, target)) {
      updateAppRuntimeState((state) => {
        state.sacnOutput.activeDocumentId = undefined;
      });
    }
  }
}

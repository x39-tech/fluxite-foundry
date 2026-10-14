import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isTauri } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { EntityId } from "app/persistentState";
import { DmxController } from "app/runtimeState";
import { updateAppRuntimeState, useAppRuntimeStore } from "app/store";
import { resetAppRuntimeStore } from "test/utils";
import {
  initSacnOutputEffects,
  sacnOutputSettled,
  stopSacnOutputEffects,
} from "./effects";
import { startSacnOutput, stopSacnOutput } from "./native";
import { setSacnOutputActive, updateSacnOutputSettings } from "./state";

vi.mock("@tauri-apps/api/core", () => ({ isTauri: vi.fn() }));
vi.mock("./native", () => ({
  startSacnOutput: vi.fn(() => Promise.resolve()),
  stopSacnOutput: vi.fn(() => Promise.resolve()),
}));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

const documentId = "doc" as EntityId;

// The output only runs for a document that has a DMX test driver.
function openDocumentWithDriver(id: EntityId) {
  updateAppRuntimeState((state) => {
    state.dmxControllers[id] = { state: "not-created" } as DmxController;
  });
}

const activeDocument = () =>
  useAppRuntimeStore.getState().sacnOutput.activeDocumentId;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isTauri).mockReturnValue(true);
  resetAppRuntimeStore();
  openDocumentWithDriver(documentId);
  updateSacnOutputSettings(documentId, { interfaceName: "en0", universe: 3 });
});

afterEach(async () => {
  stopSacnOutputEffects();
  await sacnOutputSettled();
});

describe("on the desktop", () => {
  beforeEach(() => {
    initSacnOutputEffects();
  });

  it("starts transmitting with the active document's settings", async () => {
    setSacnOutputActive(documentId, true);
    await sacnOutputSettled();

    expect(startSacnOutput).toHaveBeenCalledExactlyOnceWith("en0", 3);
  });

  it("restarts on the new universe when it changes", async () => {
    setSacnOutputActive(documentId, true);
    updateSacnOutputSettings(documentId, { universe: 7 });
    await sacnOutputSettled();

    expect(startSacnOutput).toHaveBeenLastCalledWith("en0", 7);
  });

  it("does not restart for a change to the start address", async () => {
    setSacnOutputActive(documentId, true);
    await sacnOutputSettled();
    updateSacnOutputSettings(documentId, { startAddress: 100 });
    await sacnOutputSettled();

    expect(startSacnOutput).toHaveBeenCalledOnce();
  });

  it("stops transmitting when turned off", async () => {
    setSacnOutputActive(documentId, true);
    await sacnOutputSettled();
    setSacnOutputActive(documentId, false);
    await sacnOutputSettled();

    expect(stopSacnOutput).toHaveBeenCalledOnce();
  });

  it("turns off and stops when the document's driver goes away", async () => {
    setSacnOutputActive(documentId, true);
    await sacnOutputSettled();
    updateAppRuntimeState((state) => {
      delete state.dmxControllers[documentId];
    });
    await sacnOutputSettled();

    expect(activeDocument()).toBeUndefined();
    expect(stopSacnOutput).toHaveBeenCalledOnce();
  });

  it("reports a failure to start and turns the output off", async () => {
    vi.mocked(startSacnOutput).mockRejectedValueOnce(
      "network interface en0 has no IPv4 address",
    );

    setSacnOutputActive(documentId, true);
    await sacnOutputSettled();

    expect(toast.error).toHaveBeenCalledWith(
      "Could not start sACN output: network interface en0 has no IPv4 address",
    );
    expect(activeDocument()).toBeUndefined();
  });
});

it("does nothing in the browser", async () => {
  vi.mocked(isTauri).mockReturnValue(false);
  initSacnOutputEffects();

  setSacnOutputActive(documentId, true);
  await sacnOutputSettled();

  expect(startSacnOutput).not.toHaveBeenCalled();
});

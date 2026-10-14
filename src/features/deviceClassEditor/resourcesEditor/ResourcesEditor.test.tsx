import { describe, test, expect, beforeEach } from "vitest";
import { render, screen } from "test/render";
import userEvent from "@testing-library/user-event";
import { documentTypes, EntityId } from "app/persistentState";
import { useAppPersistentStore } from "app/store";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import {
  addEmitter,
  addEmitterGroup,
  addSpd,
  createEmittersStructure,
} from "../emittersEditor/state";
import { ResourcesEditor } from "./ResourcesEditor";

function document() {
  const state = useAppPersistentStore.getState();
  const doc = state.documents[state.session.selectedDocumentId!];
  if (doc.type !== documentTypes.DEVICE_CLASS) {
    throw new Error("The open document is not a device class");
  }
  return doc;
}

// An emitter with a resource-backed SPD, which is the only way a resource the
// user did not create themselves ends up in the list.
function createSpdBackedResource() {
  createEmittersStructure();
  addEmitterGroup();
  const groupId = document().emitterGroupEditors[0];
  addEmitter(groupId);
  addSpd(EntityId(Object.keys(document().emitters)[0]));
}

describe("a resource holding an emitter's spectral power distribution", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    createSpdBackedResource();
  });

  test("is listed like any other resource", () => {
    render(<ResourcesEditor />);

    expect(
      screen.getByRole("button", { name: "spd-emitter" }),
    ).toBeInTheDocument();
  });

  test("refuses to be deleted from the resources list", async () => {
    const user = userEvent.setup();
    render(<ResourcesEditor />);

    await user.click(screen.getByRole("button", { name: "spd-emitter" }));
    await user.click(screen.getByRole("button", { name: "Delete Resource" }));

    expect(Object.values(document().resources)).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "spd-emitter" }),
    ).toBeInTheDocument();
  });

  test("says its file is written by the emitters structure", async () => {
    const user = userEvent.setup();
    render(<ResourcesEditor />);

    await user.click(screen.getByRole("button", { name: "spd-emitter" }));

    expect(
      screen.getByText(/Its file is written when the device class is exported/),
    ).toBeInTheDocument();
  });
});

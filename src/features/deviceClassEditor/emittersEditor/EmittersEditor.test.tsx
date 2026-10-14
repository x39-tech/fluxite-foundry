import { describe, test, expect, beforeEach } from "vitest";
import { render, screen, within } from "test/render";
import userEvent from "@testing-library/user-event";
import { documentTypes } from "app/persistentState";
import { useAppPersistentStore } from "app/store";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { EmittersEditor } from "./EmittersEditor";

function document() {
  const state = useAppPersistentStore.getState();
  const doc = state.documents[state.session.selectedDocumentId!];
  if (doc.type !== documentTypes.DEVICE_CLASS) {
    throw new Error("The open document is not a device class");
  }
  return doc;
}

async function addStructure(user: ReturnType<typeof userEvent.setup>) {
  await user.click(
    screen.getByRole("button", { name: "Add Emitters Structure" }),
  );
}

async function addGroupWithEmitter(user: ReturnType<typeof userEvent.setup>) {
  await addStructure(user);
  await user.click(screen.getByRole("button", { name: "Add Emitter Group" }));
  await user.click(screen.getByRole("button", { name: "Add Emitter" }));
}

describe("the emitters editor", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
  });

  test("offers to create the structure when the document has none", () => {
    render(<EmittersEditor />);

    expect(
      screen.getByRole("button", { name: "Add Emitters Structure" }),
    ).toBeInTheDocument();
  });

  test("creating the structure declares the library it comes from", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addStructure(user);

    expect(document().emittersStructure).toMatchObject({
      codexId: "emitters",
      access: ["read"],
      lifetime: "static",
    });
    expect(document().libraries["org.esta.lib.intensity-color"]).toBeDefined();
  });

  test("adds an emitter group and an emitter to it", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addGroupWithEmitter(user);

    expect(Object.values(document().emitterGroups)).toHaveLength(1);
    expect(Object.values(document().emitters)).toHaveLength(1);
  });

  test("starts the group's first emitter at full relative brightness", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addGroupWithEmitter(user);

    expect(Object.values(document().emitters)[0].relativeBrightness).toBe(1);
  });

  test("reports a group whose emitters are not measured against one of them", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addGroupWithEmitter(user);
    await user.click(screen.getByRole("button", { name: "Add Emitter" }));

    // The second emitter has no relative brightness, so the group is fine.
    expect(
      screen.queryByText(/No emitter in this group is at full/),
    ).not.toBeInTheDocument();

    const brightnessFields = screen.getAllByRole("textbox", {
      name: "Relative Brightness",
    });
    await user.clear(brightnessFields[0]);
    await user.keyboard("{Enter}");

    expect(
      screen.getByText(/No emitter in this group is at full/),
    ).toBeInTheDocument();
  });

  test("deleting an emitter leaves the rest of the group in order", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addGroupWithEmitter(user);
    await user.click(screen.getByRole("button", { name: "Add Emitter" }));
    await user.click(screen.getByRole("button", { name: "Add Emitter" }));

    await user.click(
      screen.getAllByRole("button", { name: "Delete Emitter" })[1],
    );

    expect(
      screen
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["emitter", "emitter-2"]);
    const [groupId] = Object.keys(document().emitterGroups);
    expect(document().emitterGroups[groupId].emitters).toHaveLength(2);
  });

  test("removing the structure clears the groups and emitters", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addGroupWithEmitter(user);
    await user.click(
      screen.getByRole("button", { name: "Remove Emitters Structure" }),
    );

    expect(document().emittersStructure).toBeUndefined();
    expect(document().emitterGroups).toEqual({});
    expect(document().emitters).toEqual({});
  });
});

describe("an emitter's spectral power distribution", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
  });

  function spdOf() {
    return Object.values(document().emitters)[0].spd;
  }

  async function addSpd(user: ReturnType<typeof userEvent.setup>) {
    await addGroupWithEmitter(user);
    await user.click(
      screen.getByRole("button", { name: "Add Spectral Power Distribution" }),
    );
  }

  test("is stored in a resource of its own by default", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addSpd(user);

    const storage = spdOf()!.storage;
    expect(storage.type).toBe("resource");
    if (storage.type !== "resource") return;
    expect(document().resources[storage.resourceId].codexId).toBe(
      "spd-emitter",
    );
  });

  test("moves inline when the resource checkbox is cleared", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addSpd(user);
    await user.click(
      screen.getByRole("checkbox", { name: "Store in a resource file" }),
    );

    expect(spdOf()!.storage.type).toBe("inline");
    expect(Object.values(document().resources)).toHaveLength(0);
  });

  test("says it has no curves until one is imported", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addSpd(user);

    expect(
      screen.getByText("This distribution has no curves in it."),
    ).toBeInTheDocument();
  });

  test("takes a curve from an imported CSV file", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addSpd(user);
    await user.click(screen.getByRole("button", { name: "Import Curve" }));

    const dialog = screen.getByRole("dialog");
    await user.upload(
      within(dialog).getByLabelText("File"),
      csvFile("400,0\n410,2\n420,4\n430,2\n440,0"),
    );
    await user.click(within(dialog).getByRole("button", { name: "Import" }));

    expect(spdOf()!.start).toBe(400);
    expect(spdOf()!.step).toBe(10);
    expect(spdOf()!.mappings).toEqual([
      { value: 1, powerDistribution: [0, 0.5, 1, 0.5, 0] },
    ]);
  });

  test("refuses a second curve that is not on the same grid", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addSpd(user);
    await importCurve(user, "400,0\n410,2\n420,4\n430,2\n440,0", "1");
    await importCurve(user, "500,0\n510,1\n520,0", "0.5");

    expect(
      screen.getByText(/The file holds 3 samples from 500nm/),
    ).toBeInTheDocument();
    expect(spdOf()!.mappings).toHaveLength(1);
  });

  test("describes the graph for a reader who cannot see it", async () => {
    const user = userEvent.setup();
    render(<EmittersEditor />);

    await addSpd(user);
    await importCurve(user, "400,0\n410,2\n420,4\n430,2\n440,0", "1");

    expect(
      screen.getByRole("img", {
        name: "Spectral power distribution, 1 curves from 400 to 440 nanometres.",
      }),
    ).toBeInTheDocument();

    const table = screen.getByRole("table", {
      name: "Spectral power distribution curves",
    });
    const row = within(table).getAllByRole("row")[1];
    expect(within(row).getByText("400 to 440 nm")).toBeInTheDocument();
    expect(within(row).getByText("420 nm")).toBeInTheDocument();
  });

  async function importCurve(
    user: ReturnType<typeof userEvent.setup>,
    contents: string,
    value: string,
  ) {
    await user.click(screen.getByRole("button", { name: "Import Curve" }));
    const dialog = openDialog();

    const valueField = within(dialog).getByRole("textbox", {
      name: "Parameter Value",
    });
    await user.clear(valueField);
    await user.type(valueField, `${value}{Enter}`);

    await user.upload(within(dialog).getByLabelText("File"), csvFile(contents));
    await user.click(within(dialog).getByRole("button", { name: "Import" }));
  }
});

function csvFile(contents: string): File {
  return new File([contents], "spd.csv", { type: "text/csv" });
}

// A dialog that has been closed stays in the tree until its exit animation
// ends, which never happens without a real layout engine.
function openDialog(): HTMLElement {
  const dialogs = screen.getAllByRole("dialog");
  return (
    dialogs.find((dialog) => dialog.dataset.state === "open") ??
    dialogs[dialogs.length - 1]
  );
}

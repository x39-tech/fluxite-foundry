import { render, screen, within } from "test/render";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test } from "vitest";
import { DmxSerializer, EntityId } from "app/persistentState";
import { useAppPersistentStore } from "app/store";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { getCurrentEditor } from "../state";
import { DmxEditor } from "./DmxEditor";
import { addDmxChunk, addDmxMode, changeDmxChunkOffsets } from "./state";

const TAB_ID = "dmx-tab";

beforeEach(() => {
  resetAllStores();
  createEmptyDeviceClassEditor();
  addDmxMode();
});

function serializers(): Record<EntityId, DmxSerializer> {
  return (
    getCurrentEditor(useAppPersistentStore.getState())?.dmxSerializers ?? {}
  );
}

function serializerIds(): EntityId[] {
  return Object.keys(serializers()) as EntityId[];
}

/** Adds a slot group to a mode and moves it onto the given offsets. */
function addChunkWithOffsets(
  offsets: string[],
  serializerId: EntityId = serializerIds()[0],
) {
  addDmxChunk(serializerId);

  const chunkIds = Object.keys(
    serializers()[serializerId].chunks,
  ) as EntityId[];
  changeDmxChunkOffsets(serializerId, chunkIds[chunkIds.length - 1], offsets);
}

/** The list rows for a slot group, which open its editor when clicked. */
function slotGroupRows(name: string) {
  return screen.queryAllByRole("button", { name });
}

test("lists each slot group by the offsets it uses", () => {
  addChunkWithOffsets(["3"]);
  addChunkWithOffsets(["9", "10"]);

  render(<DmxEditor tabId={TAB_ID} />);

  expect(slotGroupRows("Slot 3").length).toBeGreaterThan(0);
  expect(slotGroupRows("Slot 9, 10").length).toBeGreaterThan(0);
});

test("adds a slot group", async () => {
  const user = userEvent.setup();

  render(<DmxEditor tabId={TAB_ID} />);

  await user.click(screen.getByRole("button", { name: "Add DMX Slot Group" }));

  // The first group added takes the first free offset.
  expect(slotGroupRows("Slot 0").length).toBeGreaterThan(0);
});

test("opens the editor for a newly added slot group", async () => {
  const user = userEvent.setup();
  addChunkWithOffsets(["3"]);

  render(<DmxEditor tabId={TAB_ID} />);

  expect(screen.queryByText("Offsets Used")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Add DMX Slot Group" }));

  expect(
    screen.getByRole("button", { name: "Slot 0", pressed: true }),
  ).toBeInTheDocument();
  expect(screen.getByText("Offsets Used")).toBeInTheDocument();
});

test("orders the slot groups by their first offset", () => {
  addChunkWithOffsets(["27"]);
  addChunkWithOffsets(["3"]);
  addChunkWithOffsets(["9", "10"]);

  render(<DmxEditor tabId={TAB_ID} />);

  // The list carries one row per slot group, in display order.
  const rows = screen
    .getAllByRole("button", { name: /^Slot / })
    .map((button) => button.textContent);

  expect(rows).toEqual(["Slot 3", "Slot 9, 10", "Slot 27"]);
});

test("opens the editor for the slot group that is selected", async () => {
  const user = userEvent.setup();
  addChunkWithOffsets(["3"]);

  render(<DmxEditor tabId={TAB_ID} />);

  expect(screen.queryByText("Offsets Used")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Slot 3" }));

  expect(screen.getByText("Offsets Used")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Mapping Group" }),
  ).toBeInTheDocument();
});

test("filters the slot groups by the search text", async () => {
  const user = userEvent.setup();
  addChunkWithOffsets(["3"]);
  addChunkWithOffsets(["27"]);

  render(<DmxEditor tabId={TAB_ID} />);

  await user.type(screen.getByRole("searchbox"), "27");

  expect(slotGroupRows("Slot 27").length).toBeGreaterThan(0);
  expect(slotGroupRows("Slot 3")).toHaveLength(0);
});

test("deletes a slot group", async () => {
  const user = userEvent.setup();
  addChunkWithOffsets(["3"]);

  render(<DmxEditor tabId={TAB_ID} />);

  await user.click(screen.getByRole("button", { name: "Slot 3" }));
  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(slotGroupRows("Slot 3")).toHaveLength(0);
});

describe("modes", () => {
  const modeSelect = () => screen.getByRole("combobox", { name: "Mode" });
  const modeIdInput = () => screen.getByRole("textbox", { name: "Mode ID" });

  function modeIds(): string[] {
    return Object.values(serializers()).map((serializer) => serializer.codexId);
  }

  async function selectMode(
    user: ReturnType<typeof userEvent.setup>,
    codexId: string,
  ) {
    await user.click(modeSelect());
    await user.click(screen.getByRole("option", { name: codexId }));
  }

  test("only has the add mode button when there are no modes", async () => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    const user = userEvent.setup();

    render(<DmxEditor tabId={TAB_ID} />);

    expect(
      screen.queryByRole("button", { name: "Add DMX Slot Group" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Mode" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add Mode" }));

    expect(modeSelect()).toHaveTextContent("mode-1");
    expect(
      screen.getByRole("button", { name: "Add DMX Slot Group" }),
    ).toBeInTheDocument();
  });

  test("edits the slot groups of the selected mode", async () => {
    const user = userEvent.setup();
    addChunkWithOffsets(["3"]);

    render(<DmxEditor tabId={TAB_ID} />);

    await user.click(screen.getByRole("button", { name: "Add Mode" }));

    expect(modeSelect()).toHaveTextContent("mode-2");
    expect(slotGroupRows("Slot 3")).toHaveLength(0);

    await user.click(
      screen.getByRole("button", { name: "Add DMX Slot Group" }),
    );
    await selectMode(user, "mode-1");

    expect(slotGroupRows("Slot 3").length).toBeGreaterThan(0);
    expect(slotGroupRows("Slot 0")).toHaveLength(0);
  });

  test("changes the ID of the selected mode", async () => {
    const user = userEvent.setup();

    render(<DmxEditor tabId={TAB_ID} />);

    await user.clear(modeIdInput());
    await user.type(modeIdInput(), "extended{Enter}");

    expect(modeIds()).toEqual(["extended"]);
    expect(modeSelect()).toHaveTextContent("extended");
  });

  test("rejects an ID that another mode already has", async () => {
    const user = userEvent.setup();
    addDmxMode();

    render(<DmxEditor tabId={TAB_ID} />);

    await user.clear(modeIdInput());
    await user.type(modeIdInput(), "mode-2{Enter}");

    expect(modeIds()).toEqual(["mode-1", "mode-2"]);
  });

  test("duplicates the selected mode and edits the copy", async () => {
    const user = userEvent.setup();
    addChunkWithOffsets(["3"]);

    render(<DmxEditor tabId={TAB_ID} />);

    await user.click(screen.getByRole("button", { name: "Duplicate Mode" }));

    expect(modeIds()).toEqual(["mode-1", "mode-2"]);
    expect(modeSelect()).toHaveTextContent("mode-2");
    expect(slotGroupRows("Slot 3").length).toBeGreaterThan(0);
  });

  test("deletes the selected mode once the user confirms", async () => {
    const user = userEvent.setup();
    addDmxMode();

    render(<DmxEditor tabId={TAB_ID} />);

    await user.click(screen.getByRole("button", { name: "Delete Mode" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog).toHaveTextContent("The mode “mode-1” will be deleted");

    await user.click(
      within(dialog).getByRole("button", { name: "Delete Mode" }),
    );

    expect(modeIds()).toEqual(["mode-2"]);
    expect(modeSelect()).toHaveTextContent("mode-2");
  });

  test("keeps the mode when the user cancels deleting it", async () => {
    const user = userEvent.setup();

    render(<DmxEditor tabId={TAB_ID} />);

    await user.click(screen.getByRole("button", { name: "Delete Mode" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(modeIds()).toEqual(["mode-1"]);
  });

  test("shows a different mode in each tab", async () => {
    const user = userEvent.setup();
    addDmxMode();
    const [first, second] = serializerIds();
    addChunkWithOffsets(["3"], first);
    addChunkWithOffsets(["9"], second);

    render(
      <>
        <section aria-label="Left">
          <DmxEditor tabId="left" />
        </section>
        <section aria-label="Right">
          <DmxEditor tabId="right" />
        </section>
      </>,
    );
    const left = within(screen.getByRole("region", { name: "Left" }));
    const right = within(screen.getByRole("region", { name: "Right" }));

    await user.click(right.getByRole("combobox", { name: "Mode" }));
    await user.click(screen.getByRole("option", { name: "mode-2" }));

    expect(left.getByRole("combobox", { name: "Mode" })).toHaveTextContent(
      "mode-1",
    );
    expect(
      left.queryAllByRole("button", { name: "Slot 3" }).length,
    ).toBeGreaterThan(0);
    expect(left.queryAllByRole("button", { name: "Slot 9" })).toHaveLength(0);
    expect(right.getByRole("combobox", { name: "Mode" })).toHaveTextContent(
      "mode-2",
    );
    expect(
      right.queryAllByRole("button", { name: "Slot 9" }).length,
    ).toBeGreaterThan(0);
    expect(right.queryAllByRole("button", { name: "Slot 3" })).toHaveLength(0);
  });
});

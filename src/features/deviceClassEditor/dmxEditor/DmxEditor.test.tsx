import { render, renderHook, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { EntityId } from "app/persistentState";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { DmxEditor } from "./DmxEditor";
import { addDmxChunk, changeDmxChunkOffsets, useDmxSerializer } from "./state";

beforeEach(() => {
  resetAllStores();
  createEmptyDeviceClassEditor();
});

/** Adds a slot group and moves it onto the given offsets. */
function addChunkWithOffsets(offsets: string[]) {
  addDmxChunk();

  const { result, unmount } = renderHook(() => useDmxSerializer());
  const chunkIds = Object.keys(result.current?.chunks ?? {}) as EntityId[];
  unmount();

  changeDmxChunkOffsets(chunkIds[chunkIds.length - 1], offsets);
}

/**
 * A slot group is shown both in the list and as an accordion, so it has more
 * than one button bearing its name.
 */
function slotGroupButtons(name: string) {
  return screen.queryAllByRole("button", { name });
}

/** The collapsed accordion header for a slot group, which opens its editor. */
function collapsedSlotGroup(name: string) {
  return screen.getByRole("button", { name, expanded: false });
}

test("lists each slot group by the offsets it uses", () => {
  addChunkWithOffsets(["3"]);
  addChunkWithOffsets(["9", "10"]);

  render(<DmxEditor />);

  expect(slotGroupButtons("Slot 3").length).toBeGreaterThan(0);
  expect(slotGroupButtons("Slot 9, 10").length).toBeGreaterThan(0);
});

test("adds a slot group", async () => {
  const user = userEvent.setup();

  render(<DmxEditor />);

  await user.click(screen.getByRole("button", { name: "Add DMX Slot Group" }));

  // The first group added takes the first free offset.
  expect(slotGroupButtons("Slot 0").length).toBeGreaterThan(0);
});

test("opens the editor for a newly added slot group", async () => {
  const user = userEvent.setup();
  addChunkWithOffsets(["3"]);

  render(<DmxEditor />);

  expect(screen.queryByText("Offsets Used")).not.toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Add DMX Slot Group" }));

  expect(
    screen.getByRole("button", { name: "Slot 0", expanded: true }),
  ).toBeInTheDocument();
  expect(screen.getByText("Offsets Used")).toBeInTheDocument();
});

test("orders the slot groups by their first offset", () => {
  addChunkWithOffsets(["27"]);
  addChunkWithOffsets(["3"]);
  addChunkWithOffsets(["9", "10"]);

  render(<DmxEditor />);

  // The accordion headers carry one name per slot group, in display order.
  const headings = screen
    .getAllByRole("button", { expanded: false })
    .map((button) => button.textContent);

  expect(headings).toEqual(["Slot 3", "Slot 9, 10", "Slot 27"]);
});

test("opens the editor for the slot group that is selected", async () => {
  const user = userEvent.setup();
  addChunkWithOffsets(["3"]);

  render(<DmxEditor />);

  expect(screen.queryByText("Offsets Used")).not.toBeInTheDocument();

  await user.click(collapsedSlotGroup("Slot 3"));

  expect(screen.getByText("Offsets Used")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Mapping Group" }),
  ).toBeInTheDocument();
});

test("filters the slot groups by the search text", async () => {
  const user = userEvent.setup();
  addChunkWithOffsets(["3"]);
  addChunkWithOffsets(["27"]);

  render(<DmxEditor />);

  await user.type(screen.getByRole("searchbox"), "27");

  expect(slotGroupButtons("Slot 27").length).toBeGreaterThan(0);
  expect(slotGroupButtons("Slot 3")).toHaveLength(0);
});

test("deletes a slot group", async () => {
  const user = userEvent.setup();
  addChunkWithOffsets(["3"]);

  render(<DmxEditor />);

  await user.click(collapsedSlotGroup("Slot 3"));
  await user.click(screen.getByRole("button", { name: "Delete" }));

  expect(slotGroupButtons("Slot 3")).toHaveLength(0);
});

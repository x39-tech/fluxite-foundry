import { ComponentProps } from "react";
import { msg } from "@lingui/core/macro";
import { render, screen } from "test/render";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ListItemsEditor, ListItemsEditorLabels } from "./ListItemsEditor";
import { CodexId, EntityId } from "app/persistentState";

const labels: ListItemsEditorLabels = {
  add: msg({ id: "test.list.add", message: "Add Item" }),
  delete: msg({ id: "test.list.delete", message: "Delete Item" }),
  emptyState: msg({
    id: "test.list.emptyState",
    message: "Add a Item to start editing",
  }),
  selectPrompt: msg({
    id: "test.list.selectPrompt",
    message: "Select a Item to start editing",
  }),
};

const searchableLabels: ListItemsEditorLabels = {
  ...labels,
  search: msg({ id: "test.list.search", message: "Search Items" }),
};

const editors = [
  { id: EntityId("id-1"), codexId: CodexId("first-item") },
  { id: EntityId("id-2"), codexId: CodexId("second-item") },
];

const StubEditor = ({
  codexId,
}: {
  codexId: string;
  onDelete?: () => void;
}) => <div>{`${codexId} editor`}</div>;

function renderListItemsEditor(
  props: Partial<ComponentProps<typeof ListItemsEditor>> = {},
) {
  return render(
    <ListItemsEditor
      editors={editors}
      labels={labels}
      renderActiveEditor={(editor) => <StubEditor codexId={editor.codexId} />}
      {...props}
    />,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

test("shows the selected item's editor and scrolls it into view", async () => {
  const user = userEvent.setup();
  const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

  renderListItemsEditor();

  // Nothing is selected initially, so there is nothing to scroll to
  expect(screen.queryByText("second-item editor")).not.toBeInTheDocument();
  expect(scrollIntoView).not.toHaveBeenCalled();

  await user.click(screen.getByRole("button", { name: "second-item" }));

  expect(screen.getByText("second-item editor")).toBeInTheDocument();
  expect(scrollIntoView).toHaveBeenCalled();
});

test("scrolls back to the selected item when it is selected again", async () => {
  const user = userEvent.setup();

  renderListItemsEditor();

  await user.click(screen.getByRole("button", { name: "second-item" }));

  // Selecting the same item again should still bring it back into view, even
  // though the selection itself does not change.
  const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
  await user.click(screen.getByRole("button", { name: "second-item" }));

  expect(screen.getByText("second-item editor")).toBeInTheDocument();
  expect(scrollIntoView).toHaveBeenCalled();
});

test("scrolls to the newly selected item when the selection changes", async () => {
  const user = userEvent.setup();

  renderListItemsEditor();

  await user.click(screen.getByRole("button", { name: "second-item" }));

  const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
  await user.click(screen.getByRole("button", { name: "first-item" }));

  expect(screen.getByText("first-item editor")).toBeInTheDocument();
  expect(screen.queryByText("second-item editor")).not.toBeInTheDocument();
  expect(scrollIntoView).toHaveBeenCalled();
});

test("lists items by the title from getEditorTitle", () => {
  renderListItemsEditor({
    getEditorTitle: (editor) => `Slot ${editor.codexId}`,
  });

  expect(
    screen.getByRole("button", { name: "Slot first-item" }),
  ).toBeInTheDocument();
});

test("lists items with a subtitle under the title", () => {
  renderListItemsEditor({
    getEditorSubtitle: (editor) =>
      editor.codexId === "first-item" ? "Color › Additive" : undefined,
  });

  expect(screen.getByText("Color › Additive")).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "first-item Color › Additive" }),
  ).toBeInTheDocument();
  // An item with no subtitle is still named by its title alone.
  expect(
    screen.getByRole("button", { name: "second-item" }),
  ).toBeInTheDocument();
});

test("shows the items matching the search text in their subtitle", async () => {
  const user = userEvent.setup();

  renderListItemsEditor({
    labels: searchableLabels,
    getEditorSubtitle: (editor) =>
      editor.codexId === "first-item" ? "Color › Additive" : undefined,
  });

  await user.type(screen.getByRole("searchbox"), "additive");

  expect(
    screen.getByRole("button", { name: "first-item Color › Additive" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "second-item" }),
  ).not.toBeInTheDocument();
});

test("searches text the rows do not show when one is given", async () => {
  const user = userEvent.setup();

  renderListItemsEditor({
    labels: searchableLabels,
    getEditorTitle: () => "item",
    getEditorSearchText: (editor) => editor.codexId,
  });

  await user.type(screen.getByRole("searchbox"), "second-item");

  expect(screen.getAllByRole("button", { name: "item" })).toHaveLength(1);
});

test("offers a delete button only on the selected item", async () => {
  const user = userEvent.setup();

  renderListItemsEditor();

  expect(screen.queryAllByRole("button", { name: "Delete Item" })).toHaveLength(
    0,
  );

  await user.click(screen.getByRole("button", { name: "second-item" }));

  expect(screen.getAllByRole("button", { name: "Delete Item" })).toHaveLength(
    1,
  );
});

test("deletes the selected item from its own row", async () => {
  const user = userEvent.setup();
  const onDeleteItem = vi.fn();

  renderListItemsEditor({ onDeleteItem });

  await user.click(screen.getByRole("button", { name: "second-item" }));
  await user.click(screen.getByRole("button", { name: "Delete Item" }));

  expect(onDeleteItem).toHaveBeenCalledWith(editors[1]);
});

test("shows only the items matching the search text", async () => {
  const user = userEvent.setup();

  renderListItemsEditor({ labels: searchableLabels });

  await user.type(screen.getByRole("searchbox"), "second");

  expect(
    screen.getByRole("button", { name: "second-item" }),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "first-item" }),
  ).not.toBeInTheDocument();
});

test("keeps the selected item's editor open while it still matches the search", async () => {
  const user = userEvent.setup();

  renderListItemsEditor({ labels: searchableLabels });

  await user.click(screen.getByRole("button", { name: "second-item" }));
  await user.type(screen.getByRole("searchbox"), "second");

  expect(screen.getByText("second-item editor")).toBeInTheDocument();
});

test("selects and scrolls to an item that is newly added", () => {
  const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");

  const { rerender } = renderListItemsEditor();
  expect(screen.queryByText("third-item editor")).not.toBeInTheDocument();

  const added = { id: EntityId("id-3"), codexId: CodexId("third-item") };
  rerender(
    <ListItemsEditor
      editors={[...editors, added]}
      labels={labels}
      renderActiveEditor={(editor) => <StubEditor codexId={editor.codexId} />}
    />,
  );

  expect(screen.getByText("third-item editor")).toBeInTheDocument();
  expect(scrollIntoView).toHaveBeenCalled();
});

test("clears the search so a newly added item is visible", async () => {
  const user = userEvent.setup();

  const { rerender } = renderListItemsEditor({
    labels: searchableLabels,
  });
  await user.type(screen.getByRole("searchbox"), "second");

  const added = { id: EntityId("id-3"), codexId: CodexId("third-item") };
  rerender(
    <ListItemsEditor
      editors={[...editors, added]}
      labels={searchableLabels}
      renderActiveEditor={(editor) => <StubEditor codexId={editor.codexId} />}
    />,
  );

  expect(screen.getByRole("searchbox")).toHaveValue("");
  expect(screen.getByText("third-item editor")).toBeInTheDocument();
});

test("does not steal the selection when many items appear at once", () => {
  const { rerender } = renderListItemsEditor();

  // Loading or importing a device class brings in many items at once.
  rerender(
    <ListItemsEditor
      editors={[
        ...editors,
        { id: EntityId("id-3"), codexId: CodexId("third-item") },
        { id: EntityId("id-4"), codexId: CodexId("fourth-item") },
      ]}
      labels={labels}
      renderActiveEditor={(editor) => <StubEditor codexId={editor.codexId} />}
    />,
  );

  expect(screen.queryByText("third-item editor")).not.toBeInTheDocument();
  expect(screen.queryByText("fourth-item editor")).not.toBeInTheDocument();
});

test("shows only the selected item's editor", async () => {
  const user = userEvent.setup();

  renderListItemsEditor();

  await user.click(screen.getByRole("button", { name: "second-item" }));

  expect(screen.getByText("second-item editor")).toBeInTheDocument();
  expect(screen.queryByText("first-item editor")).not.toBeInTheDocument();
});

test("prompts to select an item while none is selected", () => {
  renderListItemsEditor();

  expect(
    screen.getByText("Select a Item to start editing"),
  ).toBeInTheDocument();
});

test("prompts to add an item when there are none to select", () => {
  renderListItemsEditor({ editors: [] });

  expect(screen.getByText("Add a Item to start editing")).toBeInTheDocument();
});

test("prompts to add an item when the search matches nothing", async () => {
  const user = userEvent.setup();

  renderListItemsEditor({ labels: searchableLabels });

  await user.type(screen.getByRole("searchbox"), "no such item");

  expect(screen.getByText("Add a Item to start editing")).toBeInTheDocument();
});

import { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { ListItemsEditor } from "./ListItemsEditor";
import { CodexId, EntityId } from "app/persistentState";

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
      itemType="Item"
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

test("shows only the items matching the search text", async () => {
  const user = userEvent.setup();

  renderListItemsEditor({ searchPlaceholder: "Search Items..." });

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

  renderListItemsEditor({ searchPlaceholder: "Search Items..." });

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
      itemType="Item"
      renderActiveEditor={(editor) => <StubEditor codexId={editor.codexId} />}
    />,
  );

  expect(screen.getByText("third-item editor")).toBeInTheDocument();
  expect(scrollIntoView).toHaveBeenCalled();
});

test("clears the search so a newly added item is visible", async () => {
  const user = userEvent.setup();

  const { rerender } = renderListItemsEditor({
    searchPlaceholder: "Search Items...",
  });
  await user.type(screen.getByRole("searchbox"), "second");

  const added = { id: EntityId("id-3"), codexId: CodexId("third-item") };
  rerender(
    <ListItemsEditor
      editors={[...editors, added]}
      itemType="Item"
      searchPlaceholder="Search Items..."
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
      itemType="Item"
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

  renderListItemsEditor({ searchPlaceholder: "Search Items..." });

  await user.type(screen.getByRole("searchbox"), "no such item");

  expect(screen.getByText("Add a Item to start editing")).toBeInTheDocument();
});

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

function renderListItemsEditor() {
  return render(
    <ListItemsEditor
      editors={editors}
      itemType="Item"
      renderActiveEditor={(editor) => <StubEditor codexId={editor.codexId} />}
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

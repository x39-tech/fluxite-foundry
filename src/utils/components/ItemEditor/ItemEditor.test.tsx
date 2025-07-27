import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemEditor } from "./ItemEditor";

describe("ItemEditor", () => {
  it("renders with title", () => {
    render(
      <ItemEditor title="Test Item" onDelete={() => {}}>
        <div>Test content</div>
      </ItemEditor>,
    );

    expect(screen.getByText("Test Item")).toBeInTheDocument();
  });

  it("starts collapsed by default", () => {
    render(
      <ItemEditor title="Test Item" onDelete={() => {}}>
        <div>Test content</div>
      </ItemEditor>,
    );

    // Content should not be visible initially
    expect(screen.queryByText("Test content")).not.toBeInTheDocument();
  });

  it("starts expanded when expanded prop is true", () => {
    render(
      <ItemEditor title="Test Item" expanded={true} onDelete={() => {}}>
        <div>Test content</div>
      </ItemEditor>,
    );

    // Content should be visible when expanded
    expect(screen.getByText("Test content")).toBeInTheDocument();
  });

  it("toggles content visibility when expand button is clicked", async () => {
    const user = userEvent.setup();
    render(
      <ItemEditor title="Test Item" onDelete={() => {}}>
        <div>Test content</div>
      </ItemEditor>,
    );

    // Initially collapsed
    expect(screen.queryByText("Test content")).not.toBeInTheDocument();

    // Click expand button
    const expandButton = screen.getByLabelText("Expand Test Item");
    await user.click(expandButton);

    // Content should now be visible
    expect(screen.getByText("Test content")).toBeInTheDocument();

    // Click again to collapse
    await user.click(expandButton);

    // Content should be hidden again
    expect(screen.queryByText("Test content")).not.toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    const handleDelete = vi.fn();

    render(
      <ItemEditor title="Test Item" onDelete={handleDelete}>
        <div>Test content</div>
      </ItemEditor>,
    );

    const deleteButton = screen.getByLabelText("Delete Test Item");
    await user.click(deleteButton);

    expect(handleDelete).toHaveBeenCalledTimes(1);
  });
});

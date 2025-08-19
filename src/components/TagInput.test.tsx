import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TagInput } from "./TagInput";

describe("TagInput", () => {
  it("renders with empty values", () => {
    render(<TagInput values={[]} />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
  });

  it("renders with initial values", () => {
    render(<TagInput values={["tag1", "tag2", "tag3"]} />);

    expect(screen.getByText("tag1")).toBeInTheDocument();
    expect(screen.getByText("tag2")).toBeInTheDocument();
    expect(screen.getByText("tag3")).toBeInTheDocument();
  });

  it("displays placeholder when no values exist", () => {
    render(<TagInput values={[]} placeholder="Add tags..." />);
    const input = screen.getByPlaceholderText("Add tags...");
    expect(input).toBeInTheDocument();
  });

  it("hides placeholder when values exist", () => {
    render(<TagInput values={["tag1"]} placeholder="Add tags..." />);
    const input = screen.getByRole("textbox");
    expect(input).not.toHaveAttribute("placeholder", "Add tags...");
  });

  it("adds new tag when Enter is pressed", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput values={["existing"]} onValuesChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "newtag");
    await user.keyboard("{Enter}");

    expect(handleChange).toHaveBeenCalledWith(["existing", "newtag"]);
  });

  it("clears input after adding tag", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput values={[]} onValuesChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "newtag");
    await user.keyboard("{Enter}");

    expect(input).toHaveValue("");
  });

  it("trims whitespace from new tags", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput values={[]} onValuesChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "  spaced tag  ");
    await user.keyboard("{Enter}");

    expect(handleChange).toHaveBeenCalledWith(["spaced tag"]);
  });

  it("does not add empty tags", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput values={[]} onValuesChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "   ");
    await user.keyboard("{Enter}");

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("does not add duplicate tags", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput values={["existing"]} onValuesChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "existing");
    await user.keyboard("{Enter}");

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("removes tag when remove button is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TagInput
        values={["tag1", "tag2", "tag3"]}
        onValuesChange={handleChange}
      />,
    );

    const removeButtons = screen.getAllByText("Remove tag");
    await user.click(removeButtons[1].closest("button")!); // Remove second tag

    expect(handleChange).toHaveBeenCalledWith(["tag1", "tag3"]);
  });

  it("removes last tag when Backspace is pressed on empty input", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TagInput values={["tag1", "tag2"]} onValuesChange={handleChange} />,
    );

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Backspace}");

    expect(handleChange).toHaveBeenCalledWith(["tag1"]);
  });

  it("does not remove tag when Backspace is pressed with text in input", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(
      <TagInput values={["tag1", "tag2"]} onValuesChange={handleChange} />,
    );

    const input = screen.getByRole("textbox");
    await user.type(input, "some text");
    await user.keyboard("{Backspace}");

    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("some tex"); // Only removes character from input
  });

  it("does not remove tag when no tags exist and Backspace is pressed", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput values={[]} onValuesChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{Backspace}");

    expect(handleChange).not.toHaveBeenCalled();
  });

  it("focuses input when container is clicked", async () => {
    const user = userEvent.setup();
    render(<TagInput values={["tag1"]} />);

    const container = screen
      .getByRole("textbox")
      .closest("[data-slot='tag-input']");
    const input = screen.getByRole("textbox");

    await user.click(container!);
    expect(input).toHaveFocus();
  });

  it("renders as disabled when disabled prop is true", () => {
    render(<TagInput values={["tag1"]} disabled />);

    const input = screen.getByRole("textbox");
    expect(input).toBeDisabled();

    const container = input.closest("[data-slot='tag-input']");
    expect(container).toHaveClass("cursor-not-allowed", "opacity-50");
  });

  it("does not show remove buttons when disabled", () => {
    render(<TagInput values={["tag1", "tag2"]} disabled />);

    const removeButtons = screen.queryAllByText("Remove tag");
    expect(removeButtons).toHaveLength(0);
  });

  it("does not focus input when container is clicked and disabled", async () => {
    const user = userEvent.setup();
    render(<TagInput values={["tag1"]} disabled />);

    const container = screen
      .getByRole("textbox")
      .closest("[data-slot='tag-input']");
    const input = screen.getByRole("textbox");

    await user.click(container!);
    expect(input).not.toHaveFocus();
  });

  it("does not accept input when disabled", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<TagInput values={[]} onValuesChange={handleChange} disabled />);

    const input = screen.getByRole("textbox");
    await user.type(input, "newtag");
    await user.keyboard("{Enter}");

    expect(handleChange).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });

  it("applies custom className", () => {
    render(<TagInput values={[]} className="custom-class" />);
    const container = screen
      .getByRole("textbox")
      .closest("[data-slot='tag-input']");
    expect(container).toHaveClass("custom-class");
  });

  it("forwards ref to container div", () => {
    const ref = vi.fn();
    render(<TagInput ref={ref} values={[]} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLDivElement));
  });

  it("stops propagation when remove button is clicked", async () => {
    const user = userEvent.setup();
    const containerClick = vi.fn();
    const handleChange = vi.fn();

    render(
      <div onClick={containerClick}>
        <TagInput values={["tag1"]} onValuesChange={handleChange} />
      </div>,
    );

    const removeButton = screen.getByText("Remove tag").closest("button")!;
    await user.click(removeButton);

    expect(handleChange).toHaveBeenCalledWith([]);
    expect(containerClick).not.toHaveBeenCalled();
  });

  it("has proper accessibility attributes", () => {
    render(<TagInput values={["tag1", "tag2"]} />);

    const removeTexts = screen.getAllByText("Remove tag");
    expect(removeTexts).toHaveLength(2);

    removeTexts.forEach((text) => {
      const button = text.closest("button");
      expect(button).toHaveAttribute("type", "button");
      expect(button).toHaveAttribute("tabIndex", "-1");
    });
  });

  it("updates input value correctly during typing", async () => {
    const user = userEvent.setup();
    render(<TagInput values={[]} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "typing test");

    expect(input).toHaveValue("typing test");
  });

  it("calls onValuesChange with current values plus new tag", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    const initialValues = ["existing1", "existing2"];

    render(<TagInput values={initialValues} onValuesChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "new tag");
    await user.keyboard("{Enter}");

    expect(handleChange).toHaveBeenCalledWith([...initialValues, "new tag"]);
  });

  it("does not call onValuesChange when onValuesChange is not provided", async () => {
    const user = userEvent.setup();

    // This should not throw an error
    render(<TagInput values={["tag1"]} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "newtag");
    await user.keyboard("{Enter}");

    // No error should occur
    expect(input).toHaveValue("");
  });
});

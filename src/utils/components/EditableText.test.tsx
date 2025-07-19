import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EditableText } from "./EditableText";

describe("EditableText", () => {
  it("renders with default value", () => {
    render(<EditableText defaultValue="Test value" />);
    expect(screen.getByText("Test value")).toBeInTheDocument();
  });

  it("renders placeholder when no value is provided", () => {
    render(<EditableText placeholder="Click to edit..." />);
    expect(screen.getByText("Click to edit...")).toBeInTheDocument();
  });

  it("enters edit mode when clicked", async () => {
    const user = userEvent.setup();
    render(<EditableText defaultValue="Test value" />);

    await user.click(screen.getByText("Test value"));
    expect(screen.getByDisplayValue("Test value")).toBeInTheDocument();
  });

  it("calls onChange when value changes", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<EditableText defaultValue="Test" onChange={handleChange} />);

    await user.click(screen.getByText("Test"));
    const input = screen.getByDisplayValue("Test");
    await user.clear(input);
    await user.type(input, "New value");

    expect(handleChange).toHaveBeenCalledWith("New value");
  });

  it("calls onConfirm when Enter is pressed", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(<EditableText defaultValue="Test" onConfirm={handleConfirm} />);

    await user.click(screen.getByText("Test"));
    const input = screen.getByDisplayValue("Test");
    await user.clear(input);
    await user.type(input, "New value");
    await user.keyboard("{Enter}");

    expect(handleConfirm).toHaveBeenCalledWith("New value");
  });

  it("calls onCancel when Escape is pressed", async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();
    render(<EditableText defaultValue="Test" onCancel={handleCancel} />);

    await user.click(screen.getByText("Test"));
    const input = screen.getByDisplayValue("Test");
    await user.type(input, "New value");
    await user.keyboard("{Escape}");

    expect(handleCancel).toHaveBeenCalled();
  });

  it("confirms value on blur", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(<EditableText defaultValue="Test" onConfirm={handleConfirm} />);

    await user.click(screen.getByText("Test"));
    const input = screen.getByDisplayValue("Test");
    await user.clear(input);
    await user.type(input, "New value");
    fireEvent.blur(input);

    expect(handleConfirm).toHaveBeenCalledWith("New value");
  });

  it("respects maxLength prop", async () => {
    const user = userEvent.setup();
    render(<EditableText defaultValue="" maxLength={5} />);

    await user.click(screen.getByText("Click to edit..."));
    const input = screen.getByRole("textbox");
    await user.type(input, "123456789");

    expect(input).toHaveValue("12345");
  });

  it("renders as disabled when disabled prop is true", () => {
    render(<EditableText defaultValue="Test" disabled />);
    const element = screen.getByText("Test");
    expect(element).toHaveClass("cursor-not-allowed", "opacity-60");
  });

  it("does not enter edit mode when disabled", async () => {
    const user = userEvent.setup();
    render(<EditableText defaultValue="Test" disabled />);

    await user.click(screen.getByText("Test"));
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("renders with correct intent styling", () => {
    const { rerender } = render(
      <EditableText defaultValue="Test" intent="danger" />,
    );
    expect(screen.getByText("Test")).toHaveClass("border-red-500");

    rerender(<EditableText defaultValue="Test" intent="success" />);
    expect(screen.getByText("Test")).toHaveClass("border-green-500");
  });

  it("renders as textarea when multiline is true", async () => {
    const user = userEvent.setup();
    render(<EditableText defaultValue="Test" multiline />);

    await user.click(screen.getByText("Test"));
    expect(screen.getByRole("textbox")).toBeInstanceOf(HTMLTextAreaElement);
  });

  it("does not confirm on Enter when multiline is true", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(
      <EditableText defaultValue="Test" multiline onConfirm={handleConfirm} />,
    );

    await user.click(screen.getByText("Test"));
    const textarea = screen.getByRole("textbox");
    await user.type(textarea, "{Enter}");

    expect(handleConfirm).not.toHaveBeenCalled();
  });
});

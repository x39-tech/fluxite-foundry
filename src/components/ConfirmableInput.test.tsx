import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmableInput } from "./ConfirmableInput";

describe("ConfirmableInput", () => {
  it("renders with value", () => {
    render(<ConfirmableInput value="Test value" />);
    expect(screen.getByDisplayValue("Test value")).toBeInTheDocument();
  });

  it("renders placeholder when no value is provided", () => {
    render(<ConfirmableInput placeholder="Enter text..." />);
    const input = screen.getByPlaceholderText("Enter text...");
    expect(input).toBeInTheDocument();
  });

  it("updates current value when typing", async () => {
    const user = userEvent.setup();
    render(<ConfirmableInput value="Test" />);

    const input = screen.getByDisplayValue("Test");
    await user.clear(input);
    await user.type(input, "New value");

    expect(input).toHaveValue("New value");
  });

  it("calls onConfirm when Enter is pressed", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(<ConfirmableInput value="Test" onConfirm={handleConfirm} />);

    const input = screen.getByDisplayValue("Test");
    await user.clear(input);
    await user.type(input, "New value");
    await user.keyboard("{Enter}");

    expect(handleConfirm).toHaveBeenCalledWith("New value");
  });

  it("calls onCancel when Escape is pressed", async () => {
    const user = userEvent.setup();
    const handleCancel = vi.fn();
    render(<ConfirmableInput value="Test" onCancel={handleCancel} />);

    const input = screen.getByDisplayValue("Test");
    await user.type(input, "New value");
    await user.keyboard("{Escape}");

    expect(handleCancel).toHaveBeenCalled();
  });

  it("reverts to original value when Escape is pressed", async () => {
    const user = userEvent.setup();
    render(<ConfirmableInput value="Original" />);

    const input = screen.getByDisplayValue("Original");
    await user.clear(input);
    await user.type(input, "Modified value");
    expect(input).toHaveValue("Modified value");

    await user.keyboard("{Escape}");
    expect(input).toHaveValue("Original");
  });

  it("confirms value on blur", async () => {
    const user = userEvent.setup();
    const handleConfirm = vi.fn();
    render(<ConfirmableInput value="Test" onConfirm={handleConfirm} />);

    const input = screen.getByDisplayValue("Test");
    await user.clear(input);
    await user.type(input, "New value");
    fireEvent.blur(input);

    expect(handleConfirm).toHaveBeenCalledWith("New value");
  });

  it("respects maxLength prop", async () => {
    const user = userEvent.setup();
    render(<ConfirmableInput value="" maxLength={5} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "123456789");

    expect(input).toHaveValue("12345");
  });

  it("renders as disabled when disabled prop is true", () => {
    render(<ConfirmableInput value="Test" disabled />);
    const input = screen.getByDisplayValue("Test");
    expect(input).toBeDisabled();
  });

  it("does not accept input when disabled", async () => {
    const user = userEvent.setup();
    render(<ConfirmableInput value="Test" disabled />);

    const input = screen.getByDisplayValue("Test");
    await user.type(input, "New text");
    expect(input).toHaveValue("Test");
  });

  it("calls validator when value changes", async () => {
    const user = userEvent.setup();
    const validator = vi.fn().mockReturnValue({ isValid: true });
    const onValidationResult = vi.fn();
    render(
      <ConfirmableInput
        value="Test"
        validator={validator}
        onValidationResult={onValidationResult}
      />,
    );

    const input = screen.getByDisplayValue("Test");
    await user.clear(input);
    await user.type(input, "New");

    expect(validator).toHaveBeenCalledWith("New");
    expect(onValidationResult).toHaveBeenCalledWith("New", { isValid: true });
  });

  it("cancels and reverts on validation failure during confirm", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const validator = vi
      .fn()
      .mockReturnValue({ isValid: false, feedback: "Invalid" });
    const onValidationResult = vi.fn();

    render(
      <ConfirmableInput
        value="Valid"
        onConfirm={onConfirm}
        onCancel={onCancel}
        validator={validator}
        onValidationResult={onValidationResult}
      />,
    );

    const input = screen.getByDisplayValue("Valid");
    await user.clear(input);
    await user.type(input, "Invalid");
    await user.keyboard("{Enter}");

    expect(onConfirm).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalled();
    expect(input).toHaveValue("Valid");
  });

  it("can disable confirm on enter key", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <ConfirmableInput
        value="Test"
        onConfirm={onConfirm}
        confirmOnEnterKey={false}
      />,
    );

    const input = screen.getByDisplayValue("Test");
    await user.type(input, "New");
    await user.keyboard("{Enter}");

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("can disable cancel on escape key", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <ConfirmableInput
        value="Test"
        onCancel={onCancel}
        cancelOnEscapeKey={false}
      />,
    );

    const input = screen.getByDisplayValue("Test");
    await user.type(input, "New");
    await user.keyboard("{Escape}");

    expect(onCancel).not.toHaveBeenCalled();
    expect(input).toHaveValue("TestNew");
  });
});

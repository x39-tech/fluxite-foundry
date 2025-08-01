import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TextEditorField } from "./TextEditorField";

describe("TextEditorField", () => {
  it("renders with default value", () => {
    render(
      <TextEditorField defaultValue="Test value" onValueChanged={() => {}} />,
    );
    expect(screen.getByText("Test value")).toBeInTheDocument();
  });

  it("calls onValueChanged when confirmed", async () => {
    const user = userEvent.setup();
    const handleValueChanged = vi.fn();
    render(
      <TextEditorField
        defaultValue="Original"
        onValueChanged={handleValueChanged}
      />,
    );

    await user.click(screen.getByText("Original"));
    const input = screen.getByDisplayValue("Original");
    await user.clear(input);
    await user.type(input, "New value");
    await user.keyboard("{Enter}");

    expect(handleValueChanged).toHaveBeenCalledWith("New value");
  });

  it("reverts to original value when Escape is pressed", async () => {
    const user = userEvent.setup();
    const handleValueChanged = vi.fn();
    render(
      <TextEditorField
        defaultValue="Original"
        onValueChanged={handleValueChanged}
      />,
    );

    // Click to edit
    await user.click(screen.getByText("Original"));
    const input = screen.getByDisplayValue("Original");

    // Modify the value
    await user.clear(input);
    await user.type(input, "Modified value");
    expect(input).toHaveValue("Modified value");

    // Press Escape to cancel
    await user.keyboard("{Escape}");

    // Should revert to original value
    expect(screen.getByText("Original")).toBeInTheDocument();
    expect(
      screen.queryByDisplayValue("Modified value"),
    ).not.toBeInTheDocument();

    // onValueChanged should not be called when cancelling
    expect(handleValueChanged).not.toHaveBeenCalled();
  });

  it("shows validation error for invalid input", async () => {
    const user = userEvent.setup();
    const validator = vi.fn((value: string) => {
      if (value.length < 3) {
        return { isValid: false, feedback: "Must be at least 3 characters" };
      }
      return { isValid: true };
    });

    render(
      <TextEditorField
        defaultValue="Test"
        onValueChanged={() => {}}
        validator={validator}
      />,
    );

    await user.click(screen.getByText("Test"));
    const input = screen.getByDisplayValue("Test");
    await user.clear(input);
    await user.type(input, "ab");

    expect(
      screen.getByText("Must be at least 3 characters"),
    ).toBeInTheDocument();
  });

  it("does not call onValueChanged when confirming invalid input", async () => {
    const user = userEvent.setup();
    const handleValueChanged = vi.fn();
    const validator = vi.fn((value: string) => {
      if (value.length < 3) {
        return { isValid: false, feedback: "Must be at least 3 characters" };
      }
      return { isValid: true };
    });

    render(
      <TextEditorField
        defaultValue="Valid"
        onValueChanged={handleValueChanged}
        validator={validator}
      />,
    );

    await user.click(screen.getByText("Valid"));
    const input = screen.getByDisplayValue("Valid");
    await user.clear(input);
    await user.type(input, "ab");
    await user.keyboard("{Enter}");

    expect(handleValueChanged).not.toHaveBeenCalled();
    expect(screen.getByText("Valid")).toBeInTheDocument();
  });
});

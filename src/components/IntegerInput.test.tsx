import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntegerInput } from "./IntegerInput";

describe("IntegerInput", () => {
  it("renders with empty value", () => {
    render(<IntegerInput />);
    const input = screen.getByRole("textbox");
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue("");
  });

  it("renders with initial value", () => {
    render(<IntegerInput value={42} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("42");
  });

  it("renders with defaultValue", () => {
    render(<IntegerInput defaultValue={10} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("10");
  });

  it("displays placeholder when no value", () => {
    render(<IntegerInput placeholder="Enter a number..." />);
    const input = screen.getByPlaceholderText("Enter a number...");
    expect(input).toBeInTheDocument();
  });

  it("accepts valid integer input", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput onValueChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "123");

    expect(handleChange).toHaveBeenLastCalledWith(123);
    expect(input).toHaveValue("123");
  });

  it("accepts negative integers", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput onValueChange={handleChange} />);

    const input = screen.getByRole("textbox");

    // Type negative sign first
    await user.type(input, "-");
    expect(input).toHaveValue("-");

    // Then type the number
    await user.type(input, "456");

    // Check that the final value is negative
    expect(input).toHaveValue("-456");
    // The handler should have been called with the negative number
    expect(handleChange).toHaveBeenCalledWith(-456);
  });

  it("rejects non-integer input", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput onValueChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "abc123");
    await user.tab(); // Trigger blur to clean up invalid input

    // Should reject non-numeric characters after blur
    expect(input).toHaveValue("123");
    expect(handleChange).toHaveBeenCalledWith(123);
  });

  it("rejects decimal input", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput onValueChange={handleChange} />);

    const input = screen.getByRole("textbox");

    // Type each character to see what happens
    await user.type(input, "1");
    expect(input).toHaveValue("1");

    await user.type(input, "2");
    expect(input).toHaveValue("12");

    await user.type(input, ".");
    expect(input).toHaveValue("12"); // Should reject the decimal point

    await user.type(input, "3");
    expect(input).toHaveValue("123"); // Subsequent digits are accepted since decimal was rejected

    // The key thing is that the decimal point itself is rejected
    expect(handleChange).toHaveBeenCalledWith(123);
  });

  it("handles clearing the input", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput value={42} onValueChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.clear(input);

    expect(handleChange).toHaveBeenLastCalledWith(null);
  });

  it("increments value when up button is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput value={5} onValueChange={handleChange} />);

    const incrementButton = screen.getByText("Increment").closest("button")!;
    await user.click(incrementButton);

    expect(handleChange).toHaveBeenCalledWith(6);
  });

  it("decrements value when down button is clicked", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput value={5} onValueChange={handleChange} />);

    const decrementButton = screen.getByText("Decrement").closest("button")!;
    await user.click(decrementButton);

    expect(handleChange).toHaveBeenCalledWith(4);
  });

  it("increments from 0 when value is undefined", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput onValueChange={handleChange} />);

    const incrementButton = screen.getByText("Increment").closest("button")!;
    await user.click(incrementButton);

    expect(handleChange).toHaveBeenCalledWith(1);
  });

  it("decrements from 0 when value is undefined", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput onValueChange={handleChange} />);

    const decrementButton = screen.getByText("Decrement").closest("button")!;
    await user.click(decrementButton);

    expect(handleChange).toHaveBeenCalledWith(-1);
  });

  it("respects custom step value", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput value={10} step={5} onValueChange={handleChange} />);

    const incrementButton = screen.getByText("Increment").closest("button")!;
    await user.click(incrementButton);

    expect(handleChange).toHaveBeenCalledWith(15);

    const decrementButton = screen.getByText("Decrement").closest("button")!;
    await user.click(decrementButton);

    expect(handleChange).toHaveBeenCalledWith(5);
  });

  it("respects min constraint", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput value={1} min={0} onValueChange={handleChange} />);

    const decrementButton = screen.getByText("Decrement").closest("button")!;
    await user.click(decrementButton);

    expect(handleChange).toHaveBeenCalledWith(0);

    // Try to go below min
    await user.click(decrementButton);
    expect(handleChange).toHaveBeenCalledWith(0); // Should stay at min
  });

  it("respects max constraint", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput value={9} max={10} onValueChange={handleChange} />);

    const incrementButton = screen.getByText("Increment").closest("button")!;
    await user.click(incrementButton);

    expect(handleChange).toHaveBeenCalledWith(10);

    // Try to go above max
    await user.click(incrementButton);
    expect(handleChange).toHaveBeenCalledWith(10); // Should stay at max
  });

  it("disables increment button at max value", () => {
    render(<IntegerInput value={10} max={10} />);
    const incrementButton = screen.getByText("Increment").closest("button")!;
    expect(incrementButton).toBeDisabled();
  });

  it("disables decrement button at min value", () => {
    render(<IntegerInput value={0} min={0} />);
    const decrementButton = screen.getByText("Decrement").closest("button")!;
    expect(decrementButton).toBeDisabled();
  });

  it("handles arrow key navigation", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput value={5} onValueChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.click(input);
    await user.keyboard("{ArrowUp}");

    expect(handleChange).toHaveBeenCalledWith(6);

    await user.keyboard("{ArrowDown}");
    expect(handleChange).toHaveBeenCalledWith(4);
  });

  describe("clearable functionality", () => {
    it("does not show clear button when clearable is false", () => {
      render(<IntegerInput value={42} clearable={false} />);
      const clearButton = screen.queryByText("Clear value");
      expect(clearButton).not.toBeInTheDocument();
    });

    it("shows clear button when clearable is true", () => {
      render(<IntegerInput value={42} clearable />);
      const clearButton = screen.getByText("Clear value").closest("button")!;
      expect(clearButton).toBeInTheDocument();
    });

    it("clears value when clear button is clicked", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(
        <IntegerInput value={42} clearable onValueChange={handleChange} />,
      );

      const clearButton = screen.getByText("Clear value").closest("button")!;
      await user.click(clearButton);

      expect(handleChange).toHaveBeenCalledWith(null);
    });

    it("disables clear button when value is undefined", () => {
      render(<IntegerInput clearable />);
      const clearButton = screen.getByText("Clear value").closest("button")!;
      expect(clearButton).toBeDisabled();
    });

    it("enables clear button when value is present", () => {
      render(<IntegerInput value={42} clearable />);
      const clearButton = screen.getByText("Clear value").closest("button")!;
      expect(clearButton).not.toBeDisabled();
    });
  });

  describe("disabled state", () => {
    it("renders as disabled when disabled prop is true", () => {
      render(<IntegerInput disabled />);
      const input = screen.getByRole("textbox");
      expect(input).toBeDisabled();
    });

    it("disables all buttons when disabled", () => {
      render(<IntegerInput value={5} disabled clearable />);

      const incrementButton = screen.getByText("Increment").closest("button")!;
      const decrementButton = screen.getByText("Decrement").closest("button")!;
      const clearButton = screen.getByText("Clear value").closest("button")!;

      expect(incrementButton).toBeDisabled();
      expect(decrementButton).toBeDisabled();
      expect(clearButton).toBeDisabled();
    });

    it("does not accept input when disabled", async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      render(<IntegerInput disabled onValueChange={handleChange} />);

      const input = screen.getByRole("textbox");
      await user.type(input, "123");

      expect(handleChange).not.toHaveBeenCalled();
      expect(input).toHaveValue("");
    });
  });

  it("validates input on blur", async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<IntegerInput min={0} max={100} onValueChange={handleChange} />);

    const input = screen.getByRole("textbox");
    await user.type(input, "150");
    await user.tab(); // Trigger blur

    // Should clamp to max value
    expect(input).toHaveValue("100");
    expect(handleChange).toHaveBeenLastCalledWith(100);
  });

  it("applies custom className", () => {
    render(<IntegerInput className="custom-class" />);
    const container = screen
      .getByRole("textbox")
      .closest("[data-slot='integer-input']");
    expect(container).toHaveClass("custom-class");
  });

  it("forwards ref to input element", () => {
    const ref = vi.fn();
    render(<IntegerInput ref={ref} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });

  it("does not call onValueChange when not provided", async () => {
    const user = userEvent.setup();

    // Should not throw an error
    render(<IntegerInput />);

    const input = screen.getByRole("textbox");
    await user.type(input, "123");

    expect(input).toHaveValue("123");
  });

  it("handles controlled vs uncontrolled mode correctly", async () => {
    const _user = userEvent.setup();

    // Uncontrolled mode
    const { rerender } = render(<IntegerInput defaultValue={10} />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("10");

    // Switch to controlled mode
    rerender(<IntegerInput value={20} />);
    expect(input).toHaveValue("20");
  });

  it("prevents button interactions from focusing input", async () => {
    const user = userEvent.setup();
    render(<IntegerInput value={5} />);

    const input = screen.getByRole("textbox");
    const incrementButton = screen.getByText("Increment").closest("button")!;

    await user.click(incrementButton);
    expect(input).not.toHaveFocus();
  });
});

import { useState } from "react";
import { render, screen } from "test/render";
import userEvent from "@testing-library/user-event";
import { IntegerInput } from "./IntegerInput";

type BoundsProps = {
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  hideControls?: boolean;
};

// Shim that adds a state to hold the committed value the way a typical usage
// site would.
const Harness = ({
  initial,
  onCommit,
  ...props
}: BoundsProps & { initial: number; onCommit: (value: number) => void }) => {
  const [value, setValue] = useState(initial);
  return (
    <IntegerInput
      {...props}
      value={value}
      onCommit={(newValue) => {
        onCommit(newValue);
        setValue(newValue);
      }}
    />
  );
};

const NullableHarness = ({
  initial,
  onCommit,
  ...props
}: BoundsProps & {
  initial: number | null;
  onCommit: (value: number | null) => void;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <IntegerInput
      {...props}
      nullable
      placeholder="None"
      value={value}
      onCommit={(newValue) => {
        onCommit(newValue);
        setValue(newValue);
      }}
    />
  );
};

function renderInput(initial: number, props: BoundsProps = {}) {
  const onCommit = vi.fn();
  render(<Harness initial={initial} onCommit={onCommit} {...props} />);
  return {
    onCommit,
    user: userEvent.setup(),
    input: screen.getByRole("textbox"),
  };
}

function renderNullableInput(initial: number | null, props: BoundsProps = {}) {
  const onCommit = vi.fn();
  render(<NullableHarness initial={initial} onCommit={onCommit} {...props} />);
  return {
    onCommit,
    user: userEvent.setup(),
    input: screen.getByRole("textbox"),
  };
}

const button = (name: string) => screen.getByRole("button", { name });

describe("IntegerInput", () => {
  describe("typing", () => {
    it("commits what was typed only once editing finishes", async () => {
      const { user, input, onCommit } = renderInput(0);

      await user.clear(input);
      await user.type(input, "123");
      expect(input).toHaveValue("123");
      expect(onCommit).not.toHaveBeenCalled();

      await user.tab();
      expect(onCommit).toHaveBeenCalledExactlyOnceWith(123);
      expect(input).toHaveValue("123");
    });

    it("commits and leaves the field when Enter is pressed", async () => {
      const { user, input, onCommit } = renderInput(0);

      await user.clear(input);
      await user.type(input, "42{Enter}");

      expect(onCommit).toHaveBeenCalledExactlyOnceWith(42);
      expect(input).not.toHaveFocus();
    });

    it("does not commit when the value is unchanged", async () => {
      const { user, input, onCommit } = renderInput(42);

      await user.clear(input);
      await user.type(input, "42");
      await user.tab();

      expect(onCommit).not.toHaveBeenCalled();
    });

    it("ignores characters that cannot form an integer", async () => {
      const { user, input } = renderInput(0);

      await user.clear(input);
      await user.type(input, "1a2.3");

      expect(input).toHaveValue("123");
    });

    it("accepts negative numbers, including the lone minus sign on the way", async () => {
      const { user, input, onCommit } = renderInput(0);

      await user.clear(input);
      await user.type(input, "-");
      expect(input).toHaveValue("-");

      await user.type(input, "45");
      await user.tab();
      expect(onCommit).toHaveBeenCalledWith(-45);
    });

    it("discards the edit when Escape is pressed", async () => {
      const { user, input, onCommit } = renderInput(7);

      await user.clear(input);
      await user.type(input, "99{Escape}");

      expect(input).toHaveValue("7");
      expect(input).not.toHaveFocus();
      expect(onCommit).not.toHaveBeenCalled();
    });

    it("shows a newly committed value from outside", () => {
      const { rerender } = render(
        <IntegerInput value={1} onCommit={() => {}} />,
      );
      rerender(<IntegerInput value={2} onCommit={() => {}} />);

      expect(screen.getByRole("textbox")).toHaveValue("2");
    });
  });

  describe("bounds", () => {
    it("does not clamp while typing, so values can pass through out of range digits", async () => {
      const { user, input, onCommit } = renderInput(10, { min: 10 });

      await user.clear(input);
      await user.type(input, "5");
      expect(input).toHaveValue("5");

      await user.type(input, "0");
      await user.tab();
      expect(onCommit).toHaveBeenCalledExactlyOnceWith(50);
    });

    it("clamps to the bounds on commit", async () => {
      const { user, input, onCommit } = renderInput(0, { min: 0, max: 100 });

      await user.clear(input);
      await user.type(input, "150");
      await user.tab();

      expect(onCommit).toHaveBeenCalledWith(100);
      expect(input).toHaveValue("100");
    });

    it("shows the committed value again if clamping leaves it unchanged", async () => {
      const { user, input, onCommit } = renderInput(255, { max: 255 });

      await user.type(input, "9");
      await user.tab();

      expect(onCommit).not.toHaveBeenCalled();
      expect(input).toHaveValue("255");
    });
  });

  describe("emptying the field", () => {
    it("can be emptied while editing", async () => {
      const { user, input } = renderInput(255);

      await user.click(input);
      await user.keyboard("{End}{Backspace}{Backspace}{Backspace}");

      expect(input).toHaveValue("");
    });

    it("reverts to the committed value when not nullable", async () => {
      const { user, input, onCommit } = renderInput(255);

      await user.clear(input);
      await user.tab();

      expect(onCommit).not.toHaveBeenCalled();
      expect(input).toHaveValue("255");
    });

    it("commits null when nullable", async () => {
      const { user, input, onCommit } = renderNullableInput(5);

      await user.clear(input);
      await user.tab();

      expect(onCommit).toHaveBeenCalledExactlyOnceWith(null);
      expect(input).toHaveValue("");
      expect(screen.getByPlaceholderText("None")).toBe(input);
    });
  });

  describe("stepping", () => {
    it("steps with the buttons and commits each step", async () => {
      const { user, onCommit } = renderInput(5, { step: 5 });

      await user.click(button("Increment"));
      expect(onCommit).toHaveBeenLastCalledWith(10);

      await user.click(button("Decrement"));
      await user.click(button("Decrement"));
      expect(onCommit).toHaveBeenLastCalledWith(0);
    });

    it("steps with the arrow keys", async () => {
      const { user, input, onCommit } = renderInput(5);

      await user.click(input);
      await user.keyboard("{ArrowUp}");
      expect(onCommit).toHaveBeenLastCalledWith(6);

      await user.keyboard("{ArrowDown}{ArrowDown}");
      expect(onCommit).toHaveBeenLastCalledWith(4);
    });

    it("steps from what is being typed", async () => {
      const { user, input, onCommit } = renderInput(0);

      await user.clear(input);
      await user.type(input, "20{ArrowUp}");

      expect(onCommit).toHaveBeenCalledExactlyOnceWith(21);
    });

    it("steps from zero when nullable and empty", async () => {
      const { user, onCommit } = renderNullableInput(null);

      await user.click(button("Decrement"));

      expect(onCommit).toHaveBeenCalledWith(-1);
    });

    it("clamps steps to the bounds and disables stepping past them", async () => {
      const { user, onCommit } = renderInput(8, { step: 5, max: 10 });

      await user.click(button("Increment"));

      expect(onCommit).toHaveBeenCalledWith(10);
      expect(button("Increment")).toBeDisabled();
      expect(button("Decrement")).toBeEnabled();
    });

    it("disables decrementing at the minimum", () => {
      renderInput(0, { min: 0 });

      expect(button("Decrement")).toBeDisabled();
    });
  });

  describe("clear button", () => {
    it("is shown only when nullable", () => {
      renderInput(42);

      expect(
        screen.queryByRole("button", { name: "Clear value" }),
      ).not.toBeInTheDocument();
    });

    it("commits null when clicked", async () => {
      const { user, input, onCommit } = renderNullableInput(42);

      await user.click(button("Clear value"));

      expect(onCommit).toHaveBeenCalledExactlyOnceWith(null);
      expect(input).toHaveValue("");
      expect(button("Clear value")).toBeDisabled();
    });
  });

  it("hides all buttons when controls are hidden", () => {
    renderNullableInput(42, { hideControls: true });

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("does not accept input or button presses when disabled", async () => {
    const { user, input, onCommit } = renderNullableInput(5, {
      disabled: true,
    });

    await user.type(input, "123");

    expect(input).toBeDisabled();
    expect(input).toHaveValue("5");
    expect(button("Increment")).toBeDisabled();
    expect(button("Decrement")).toBeDisabled();
    expect(button("Clear value")).toBeDisabled();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("forwards its ref to the input element", () => {
    const ref = vi.fn();
    render(<IntegerInput ref={ref} value={0} onCommit={() => {}} />);
    expect(ref).toHaveBeenCalledWith(expect.any(HTMLInputElement));
  });
});

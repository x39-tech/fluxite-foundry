import { useState } from "react";
import { render, screen } from "test/render";
import userEvent from "@testing-library/user-event";
import { NumberInput } from "./NumberInput";

// Integer behavior is covered by IntegerInput's tests

const Harness = ({
  initial,
  onCommit,
  step,
}: {
  initial: number;
  onCommit: (value: number) => void;
  step?: number;
}) => {
  const [value, setValue] = useState(initial);
  return (
    <NumberInput
      value={value}
      step={step}
      onCommit={(newValue) => {
        onCommit(newValue);
        setValue(newValue);
      }}
    />
  );
};

function renderInput(initial: number, step?: number) {
  const onCommit = vi.fn();
  render(<Harness initial={initial} onCommit={onCommit} step={step} />);
  return {
    onCommit,
    user: userEvent.setup(),
    input: screen.getByRole("textbox"),
  };
}

describe("NumberInput", () => {
  test("commits a decimal number", async () => {
    const { onCommit, user, input } = renderInput(1);

    await user.clear(input);
    await user.type(input, "-12.75{Enter}");

    expect(onCommit).toHaveBeenCalledWith(-12.75);
    expect(input).toHaveValue("-12.75");
  });

  test("ignores keystrokes that could not make a number", async () => {
    const { user, input } = renderInput(1);

    await user.clear(input);
    await user.type(input, "1.2.3a");

    expect(input).toHaveValue("1.23");
  });

  test("reverts a number left incomplete", async () => {
    const { onCommit, user, input } = renderInput(5);

    await user.clear(input);
    await user.type(input, "-.{Enter}");

    expect(onCommit).not.toHaveBeenCalled();
    expect(input).toHaveValue("5");
  });

  test("writes out numbers that would otherwise show in exponent notation", () => {
    const { input } = renderInput(-1.5e-7);
    expect(input).toHaveValue("-0.00000015");
  });

  test("writes out large numbers in full", () => {
    const { input } = renderInput(1.25e21);
    expect(input).toHaveValue("1250000000000000000000");
  });

  test("can edit a very small number", async () => {
    const { onCommit, user, input } = renderInput(1e-7);

    await user.type(input, "5{Enter}");

    expect(onCommit).toHaveBeenCalledWith(1.5e-7);
    expect(input).toHaveValue("0.00000015");
  });

  test("steps by a very small step", async () => {
    const { onCommit, user, input } = renderInput(1e-7, 1e-7);

    await user.click(input);
    await user.keyboard("{ArrowUp}");

    expect(onCommit).toHaveBeenCalledWith(2e-7);
    expect(input).toHaveValue("0.0000002");
  });

  test("steps by a fractional step without floating point error", async () => {
    const { onCommit, user, input } = renderInput(0.2, 0.1);

    await user.click(input);
    await user.keyboard("{ArrowUp}");

    expect(onCommit).toHaveBeenCalledWith(0.3);
    expect(input).toHaveValue("0.3");
  });
});

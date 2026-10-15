import { forwardRef } from "react";
import { NumberInput, NumberInputProps } from "./NumberInput";

export type IntegerInputProps = NumberInputProps;

/**
 * A text box for entering an integer. See NumberInput for how editing
 * behaves.
 */
export const IntegerInput = forwardRef<
  HTMLInputElement,
  IntegerInputProps &
    Omit<
      React.ComponentProps<"input">,
      "onChange" | "type" | "value" | "defaultValue"
    >
>((props, ref) => <NumberInput ref={ref} {...props} integer />);

IntegerInput.displayName = "IntegerInput";

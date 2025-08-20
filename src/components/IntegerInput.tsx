import { useState, useRef, forwardRef, useCallback } from "react";
import {
  ChevronUpIcon,
  ChevronDownIcon,
  XMarkIcon,
} from "@heroicons/react/24/solid";
import { cn } from "utils/utils";
import { Input } from "./scn-ui/Input";

export interface IntegerInputProps {
  value?: number | null;
  defaultValue?: number;
  onValueChange?: (value: number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  clearable?: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export const IntegerInput = forwardRef<
  HTMLInputElement,
  IntegerInputProps &
    Omit<
      React.ComponentProps<"input">,
      "onChange" | "type" | "value" | "defaultValue"
    >
>(
  (
    {
      value,
      defaultValue,
      onValueChange,
      placeholder,
      disabled,
      className,
      clearable = false,
      min,
      max,
      step = 1,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = useState<number | null>(
      value ?? defaultValue ?? null,
    );
    const [inputValue, setInputValue] = useState<string>(
      value?.toString() ?? defaultValue?.toString() ?? "",
    );
    const inputRef = useRef<HTMLInputElement>(null);

    // Use controlled value if provided, otherwise use internal state
    const currentValue = value !== undefined ? value : internalValue;
    const currentInputValue =
      value !== undefined ? value?.toString() ?? "" : inputValue;

    const validateAndClamp = useCallback(
      (num: number): number => {
        // Ensure it's an integer
        const integer = Math.round(num);

        // Apply min/max constraints
        if (min !== undefined && integer < min) return min;
        if (max !== undefined && integer > max) return max;

        return integer;
      },
      [min, max],
    );

    const updateValue = useCallback(
      (newValue: number | null, inputText?: string) => {
        const validatedValue =
          newValue !== null ? validateAndClamp(newValue) : null;

        if (value === undefined) {
          // Uncontrolled mode
          setInternalValue(validatedValue);
          // Only update input value if no input text is provided (for manual updates)
          if (inputText === undefined) {
            setInputValue(validatedValue?.toString() ?? "");
          }
        }

        onValueChange?.(validatedValue);
      },
      [value, validateAndClamp, onValueChange],
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputVal = e.target.value;

      if (value === undefined) {
        setInputValue(inputVal);
      }

      if (inputVal === "" || inputVal === "-") {
        updateValue(null, inputVal);
      } else {
        const numValue = parseInt(inputVal, 10);
        if (!isNaN(numValue)) {
          updateValue(numValue, inputVal);
        }
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const inputVal = e.target.value;

      // On blur, validate and clean up the input
      if (inputVal && !/^-?\d*$/.test(inputVal)) {
        // Invalid input - revert to last valid value
        if (currentValue !== null) {
          const displayValue = currentValue.toString();
          if (value === undefined) {
            setInputValue(displayValue);
          }
        } else {
          if (value === undefined) {
            setInputValue("");
          }
        }
      } else {
        // Valid input - ensure consistent display
        if (currentValue !== null) {
          const displayValue = currentValue.toString();
          if (value === undefined) {
            setInputValue(displayValue);
          }
        } else {
          if (value === undefined) {
            setInputValue("");
          }
        }
      }
    };

    const increment = () => {
      if (disabled) return;
      const newValue = (currentValue ?? 0) + step;
      updateValue(newValue);
    };

    const decrement = () => {
      if (disabled) return;
      const newValue = (currentValue ?? 0) - step;
      updateValue(newValue);
    };

    const clear = () => {
      if (disabled) return;
      updateValue(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        increment();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        decrement();
      }
    };

    return (
      <div
        className={cn(
          "relative flex items-center",
          disabled && "opacity-50",
          className,
        )}
        data-slot="integer-input"
      >
        <Input
          ref={ref || inputRef}
          type="text"
          inputMode="numeric"
          value={currentInputValue}
          onChange={(e) => {
            // Filter input to only allow valid integer patterns
            const inputVal = e.target.value;

            // Only process valid input
            if (
              inputVal === "" ||
              inputVal === "-" ||
              /^-?\d*$/.test(inputVal)
            ) {
              handleInputChange(e);
            }
            // For invalid input, just ignore it and keep the current value
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            // Add right padding for buttons
            clearable ? "pr-20" : "pr-12",
          )}
          {...props}
        />

        {/* Control buttons container */}
        <div className="absolute right-1 flex items-center gap-0.5">
          {clearable && (
            <button
              type="button"
              onClick={clear}
              disabled={disabled || currentValue === null}
              className={cn(
                "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors",
                "hover:text-foreground hover:bg-accent",
                "focus:outline-none focus:ring-1 focus:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              tabIndex={-1}
            >
              <XMarkIcon className="size-3.5" />
              <span className="sr-only">Clear value</span>
            </button>
          )}

          {/* Increment/Decrement buttons */}
          <div className="flex flex-col">
            <button
              type="button"
              onClick={increment}
              disabled={
                disabled ||
                (max !== undefined &&
                  currentValue !== null &&
                  currentValue >= max)
              }
              className={cn(
                "inline-flex size-3.5 items-center justify-center rounded-xs text-muted-foreground transition-colors",
                "hover:text-foreground hover:bg-accent",
                "focus:outline-none focus:ring-1 focus:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              tabIndex={-1}
            >
              <ChevronUpIcon className="size-2.5" />
              <span className="sr-only">Increment</span>
            </button>
            <button
              type="button"
              onClick={decrement}
              disabled={
                disabled ||
                (min !== undefined &&
                  currentValue !== null &&
                  currentValue <= min)
              }
              className={cn(
                "inline-flex size-3.5 items-center justify-center rounded-xs text-muted-foreground transition-colors",
                "hover:text-foreground hover:bg-accent",
                "focus:outline-none focus:ring-1 focus:ring-ring/50",
                "disabled:pointer-events-none disabled:opacity-50",
              )}
              tabIndex={-1}
            >
              <ChevronDownIcon className="size-2.5" />
              <span className="sr-only">Decrement</span>
            </button>
          </div>
        </div>
      </div>
    );
  },
);

IntegerInput.displayName = "IntegerInput";

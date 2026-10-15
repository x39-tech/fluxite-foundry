import { Trans } from "@lingui/react/macro";
import { useState, useRef, forwardRef } from "react";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { cn } from "utils/utils";
import { Input } from "./scn-ui/Input";

type NumberValueProps =
  | {
      // An emptied field reverts to the last committed value.
      nullable?: false;
      value: number;
      onCommit: (value: number) => void;
    }
  | {
      // An emptied field commits null, and a clear button is shown.
      nullable: true;
      value: number | null;
      onCommit: (value: number | null) => void;
    };

export type NumberInputProps = NumberValueProps & {
  placeholder?: string;
  disabled?: boolean;
  // Classes for the wrapper element
  className?: string;
  // Classes for the input element
  inputClassName?: string;
  // Hide the clear and increment/decrement buttons, leaving a plain numeric
  // box. The arrow keys still step the value.
  hideControls?: boolean;
  min?: number;
  max?: number;
  step?: number;
  // Accept only whole numbers.
  integer?: boolean;
};

const INTEGER_DRAFT_PATTERN = /^-?\d*$/;
const DECIMAL_DRAFT_PATTERN = /^-?\d*\.?\d*$/;

/**
 * A text box for entering a number.
 *
 * It behaves similarly to ValidatedInput in that the user can type certain
 * classes of invalid values which are only rejected when editing finishes.
 * While editing, numbers outside the range provided by min/max as well as
 * incomplete numbers such as a standalone '-' or '.' are allowed, but if the
 * value is still invalid on blur or Enter, it is clamped to the bounds or
 * reverted to the previous valid value as appropriate.
 *
 * Text that could not become a number is not accepted even in editing state.
 * With `integer`, that includes a decimal point.
 *
 * Step up and down arrows are rendered next to the box unless `hideControls`
 * is true. If `nullable`, an 'x' for clearing the value is also rendered,
 * unless `hideControls` is true.
 *
 * Step and clear buttons commit the value immediately, and Escape discards a
 * draft currently being edited.
 */
export const NumberInput = forwardRef<
  HTMLInputElement,
  NumberInputProps &
    Omit<
      React.ComponentProps<"input">,
      "onChange" | "type" | "value" | "defaultValue"
    >
>(
  (
    {
      value,
      onCommit,
      nullable,
      placeholder,
      disabled,
      className,
      inputClassName,
      hideControls = false,
      min,
      max,
      step = 1,
      integer = false,
      onBlur,
      onKeyDown,
      ...props
    },
    ref,
  ) => {
    // The text being typed, or null when not editing.
    const [draft, setDraft] = useState<string | null>(null);
    // Set by Escape so that the blur which follows it does not commit.
    const discardOnBlur = useRef(false);

    const clamp = (num: number): number => {
      if (min !== undefined && num < min) return min;
      if (max !== undefined && num > max) return max;
      return num;
    };

    const commit = (newValue: number | null) => {
      setDraft(null);
      if (newValue === null) {
        if (nullable && value !== null) onCommit(null);
        return;
      }
      const clamped = clamp(newValue);
      if (clamped !== value) {
        // The union does not narrow through destructuring, but a number is
        // valid for either variant.
        (onCommit as (value: number) => void)(clamped);
      }
    };

    const draftPattern = integer
      ? INTEGER_DRAFT_PATTERN
      : DECIMAL_DRAFT_PATTERN;

    const parseDraft = (text: string): number | null => {
      if (!/\d/.test(text)) return null;
      return integer ? parseInt(text, 10) : parseFloat(text);
    };

    const commitDraft = () => {
      if (draft !== null) commit(parseDraft(draft));
    };

    const stepBy = (delta: number) => {
      if (disabled) return;
      const base = (draft !== null ? parseDraft(draft) : null) ?? value ?? 0;
      commit(addWithoutFloatError(base, delta));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.key === "ArrowUp") {
        e.preventDefault();
        stepBy(step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        stepBy(-step);
      } else if (e.key === "Enter") {
        e.preventDefault();
        e.currentTarget.blur();
      } else if (e.key === "Escape" && draft !== null) {
        setDraft(null);
        discardOnBlur.current = true;
        e.currentTarget.blur();
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      if (discardOnBlur.current) {
        discardOnBlur.current = false;
      } else {
        commitDraft();
      }
      onBlur?.(e);
    };

    const displayedValue =
      draft ?? (value === null ? "" : toPlainString(value));
    const showClear = nullable && !hideControls;

    return (
      <div
        className={cn(
          "relative flex items-center",
          disabled && "opacity-50",
          className,
        )}
        data-slot="number-input"
      >
        <Input
          ref={ref}
          type="text"
          inputMode={integer ? "numeric" : "decimal"}
          value={displayedValue}
          onChange={(e) => {
            // Ignore keystrokes that could not lead to a number.
            if (draftPattern.test(e.target.value)) {
              setDraft(e.target.value);
            }
          }}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            // Add right padding for buttons
            hideControls ? undefined : showClear ? "pr-20" : "pr-12",
            inputClassName,
          )}
          {...props}
        />

        {/* Control buttons container */}
        {!hideControls && (
          <div className="absolute right-1 flex items-center gap-0.5">
            {showClear && (
              <button
                type="button"
                onClick={() => !disabled && commit(null)}
                disabled={disabled || value === null}
                className={cn(
                  "inline-flex size-7 items-center justify-center rounded-sm text-muted-foreground transition-colors",
                  "hover:text-foreground hover:bg-accent",
                  "focus:outline-none focus:ring-1 focus:ring-ring/50",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                tabIndex={-1}
              >
                <XIcon className="size-3.5" />
                <span className="sr-only">
                  <Trans id="numberInput.clearValue">Clear value</Trans>
                </span>
              </button>
            )}

            {/* Increment/Decrement buttons */}
            <div className="flex flex-col">
              <button
                type="button"
                onClick={() => stepBy(step)}
                disabled={
                  disabled ||
                  (max !== undefined && value !== null && value >= max)
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
                <span className="sr-only">
                  <Trans id="numberInput.increment">Increment</Trans>
                </span>
              </button>
              <button
                type="button"
                onClick={() => stepBy(-step)}
                disabled={
                  disabled ||
                  (min !== undefined && value !== null && value <= min)
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
                <span className="sr-only">
                  <Trans id="numberInput.decrement">Decrement</Trans>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

NumberInput.displayName = "NumberInput";

// Adds two numbers, rounding away the binary floating point error that would
// otherwise show up in the box, e.g. 0.1 + 0.2 giving 0.30000000000000004.
function addWithoutFloatError(a: number, b: number): number {
  const places = Math.max(decimalPlaces(a), decimalPlaces(b));
  // toFixed accepts no more than 100 digits.
  return Number((a + b).toFixed(Math.min(places, 100)));
}

function decimalPlaces(value: number): number {
  const [, fraction = ""] = toPlainString(value).split(".");
  return fraction.length;
}

// Writes a number out in full without exponent rotation.
function toPlainString(value: number): string {
  const text = value.toString();
  if (!text.includes("e")) {
    return text;
  }

  // Move the decimal point of the shortest round-trip digits that toString
  // gave, rather than formatting the number again, so no precision changes.
  const [mantissa, exponent] = text.split("e");
  const sign = mantissa.startsWith("-") ? "-" : "";
  const [whole, fraction = ""] = mantissa.replace("-", "").split(".");
  const digits = whole + fraction;
  const point = whole.length + Number(exponent);

  if (point <= 0) {
    return `${sign}0.${"0".repeat(-point)}${digits}`;
  }
  if (point >= digits.length) {
    return `${sign}${digits}${"0".repeat(point - digits.length)}`;
  }
  return `${sign}${digits.slice(0, point)}.${digits.slice(point)}`;
}

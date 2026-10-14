import { Trans } from "@lingui/react/macro";
import { useState, useRef, forwardRef } from "react";
import { ChevronDownIcon, ChevronUpIcon, XIcon } from "lucide-react";
import { cn } from "utils/utils";
import { Input } from "./scn-ui/Input";

type IntegerValueProps =
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

export type IntegerInputProps = IntegerValueProps & {
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
};

const INTEGER_DRAFT_PATTERN = /^-?\d*$/;

/**
 * A text box for entering an integer.
 *
 * It behaves similarly to ValidatedInput in that the user can type certain
 * classes of invalid values which are only rejected when editing finishes.
 * While editing, integers outside the range provided by min/max as well as a
 * standalone negative ('-') are allowed, but if the value is still invalid on
 * blur or Enter, it is clamped to the bounds or reverted to the previous valid
 * value as appropriate.
 *
 * Non-integer text is not accepted even in editing state.
 *
 * Step up and down arrows are rendered next to the box unless `hideControls`
 * is true. If `nullable`, an 'x' for clearing the value is also rendered,
 * unless `hideControls` is true.
 *
 * Step and clear buttons commit the value immediately, and Escape discards a
 * draft currently being edited.
 */
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

    const parseDraft = (text: string): number | null =>
      text === "" || text === "-" ? null : parseInt(text, 10);

    const commitDraft = () => {
      if (draft !== null) commit(parseDraft(draft));
    };

    const stepBy = (delta: number) => {
      if (disabled) return;
      const base = (draft !== null ? parseDraft(draft) : null) ?? value ?? 0;
      commit(base + delta);
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

    const displayedValue = draft ?? value?.toString() ?? "";
    const showClear = nullable && !hideControls;

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
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayedValue}
          onChange={(e) => {
            // Ignore keystrokes that could not lead to an integer.
            if (INTEGER_DRAFT_PATTERN.test(e.target.value)) {
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
                  <Trans id="integerInput.clearValue">Clear value</Trans>
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
                  <Trans id="integerInput.increment">Increment</Trans>
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
                  <Trans id="integerInput.decrement">Decrement</Trans>
                </span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  },
);

IntegerInput.displayName = "IntegerInput";

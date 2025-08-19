import { useState, useRef, forwardRef } from "react";
import { XIcon } from "lucide-react";
import { cn } from "utils/utils";

export interface TagInputProps {
  values?: string[];
  onValuesChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const TagInput = forwardRef<
  HTMLDivElement,
  TagInputProps & Omit<React.ComponentProps<"div">, "onChange">
>(
  (
    { values = [], onValuesChange, placeholder, disabled, className, ...props },
    ref,
  ) => {
    const [inputValue, setInputValue] = useState("");
    const inputRef = useRef<HTMLInputElement>(null);

    const addTag = (tagValue: string) => {
      const trimmedValue = tagValue.trim();
      if (trimmedValue && !values.includes(trimmedValue)) {
        onValuesChange?.([...values, trimmedValue]);
      }
      setInputValue("");
    };

    const removeTag = (indexToRemove: number) => {
      onValuesChange?.(values.filter((_, index) => index !== indexToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.nativeEvent.isComposing) {
        return;
      }

      if (e.key === "Enter" && inputValue.trim()) {
        e.preventDefault();
        addTag(inputValue);
      } else if (e.key === "Backspace" && !inputValue && values.length > 0) {
        e.preventDefault();
        removeTag(values.length - 1);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
    };

    const handleContainerClick = () => {
      if (!disabled) {
        inputRef.current?.focus();
      }
    };

    return (
      <div
        ref={ref}
        data-slot="tag-input"
        className={cn(
          "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-base shadow-xs transition-colors",
          "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          "dark:bg-input/30",
          disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        onClick={handleContainerClick}
        {...props}
      >
        {values.map((tag, index) => (
          <div
            key={index}
            className={cn(
              "inline-flex items-center gap-1 rounded-sm bg-secondary px-2 py-0.5 text-sm font-medium text-secondary-foreground",
              "dark:bg-secondary/50",
            )}
          >
            <span>{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(index);
                }}
                className={cn(
                  "inline-flex size-3.5 items-center justify-center rounded-xs text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-secondary-foreground/10 transition-colors",
                  "focus:outline-none focus:ring-1 focus:ring-ring/50",
                )}
                tabIndex={-1}
              >
                <XIcon className="size-2.5" />
                <span className="sr-only">Remove tag</span>
              </button>
            )}
          </div>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={values.length === 0 ? placeholder : ""}
          className={cn(
            "flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground",
            "disabled:cursor-not-allowed",
            "min-w-[120px]",
          )}
        />
      </div>
    );
  },
);

TagInput.displayName = "TagInput";

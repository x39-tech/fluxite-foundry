import { useMemo, useState } from "react";
import { CheckIcon, PlusIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { cn } from "utils/utils";
import { Popover, PopoverContent, PopoverTrigger } from "./scn-ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./scn-ui/Command";
import { Tooltip, TooltipContent, TooltipTrigger } from "./scn-ui/Tooltip";

/** One option offered by the picker, optionally under a heading. */
export interface TagOption {
  value: string;
  /** A run of adjacent options sharing a group is shown as one section. */
  group?: string;
}

/**
 * What a search returns. `note` can be used for large lists; limit options to
 * your desired limit and add a note which will be shown, e.g. "Showing 100
 * values, keep typing to narrow"
 */
export interface TagOptions {
  options: TagOption[];
  /** Shown at the foot of the list when the options overflow. */
  note?: string;
}

export interface TagSelectorProps {
  /** The chosen values, shown as chips in the order given. */
  values: string[];
  /** The options to offer for a search. An empty search means "browsing". */
  search: (query: string) => TagOptions;
  onValuesChange: (values: string[]) => void;
  /**
   * Validates a value, returning undefined (valid) or the reason it is
   * invalid.
   */
  validate?: (value: string) => string | undefined;
  addLabel?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

// Prefix each item value with the current search query, so that cmdk reads it
// as a new set of values each time the search changes. This is necessary due to
// us driving cmdk manually in this component (which is necessary for
// performance on large datasets such as media types)
function itemValue(query: string, value: string): string {
  return `${query}\0${value}`;
}

/** Chips for a set of chosen values, added from a searchable list of options. */
export const TagSelector = ({
  values,
  search,
  onValuesChange,
  validate,
  addLabel = "Add",
  searchPlaceholder = "Search...",
  emptyMessage = "No matches.",
  disabled,
  className,
  ...props
}: TagSelectorProps & Omit<React.ComponentProps<"div">, "onChange">) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const { options, note } = useMemo(() => search(query), [search, query]);

  const sections = useMemo(() => {
    const result: { group?: string; options: TagOption[] }[] = [];

    for (const option of options) {
      const section = result[result.length - 1];
      if (section && section.group === option.group) {
        section.options.push(option);
      } else {
        result.push({ group: option.group, options: [option] });
      }
    }

    return result;
  }, [options]);

  const chosen = useMemo(() => new Set(values), [values]);

  const toggleValue = (value: string) => {
    if (chosen.has(value)) {
      onValuesChange(values.filter((existing) => existing !== value));
    } else {
      onValuesChange([...values, value]);
    }
  };

  const removeValue = (value: string) => {
    onValuesChange(values.filter((existing) => existing !== value));
  };

  return (
    <div
      data-slot="tag-selector"
      role="group"
      className={cn(
        "flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent px-2 py-1.5 text-base shadow-xs transition-colors",
        "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
        "dark:bg-input/30",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...props}
    >
      {values.map((value) => (
        <Chip
          key={value}
          value={value}
          validationFailReason={validate?.(value)}
          disabled={disabled}
          onRemove={() => removeValue(value)}
        />
      ))}

      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          // Clear on open
          if (nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger
          type="button"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm font-medium text-muted-foreground transition-colors",
            "hover:bg-secondary hover:text-secondary-foreground",
            "focus:outline-none focus:ring-1 focus:ring-ring/50",
            "disabled:pointer-events-none",
          )}
        >
          <PlusIcon className="size-3.5" />
          {addLabel}
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-(--radix-popover-trigger-width) min-w-xs"
          align="start"
          // Ensures that the popover is still scrollable when inside a Dialog
          onWheel={(e) => e.stopPropagation()}
        >
          {/* The options are already searched and ordered by the caller, so
              cmdk is told not to filter or reorder them again. */}
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              placeholder={searchPlaceholder}
            />
            <CommandList>
              {options.length === 0 && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
              {sections.map((section, index) => (
                <CommandGroup
                  key={section.group ?? index}
                  heading={section.group}
                >
                  {section.options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={itemValue(query, option.value)}
                      onSelect={() => toggleValue(option.value)}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4",
                          !chosen.has(option.value) && "invisible",
                        )}
                      />
                      {option.value}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {note && (
                <div className="px-3 py-2 text-xs text-muted-foreground">
                  {note}
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

interface ChipProps {
  value: string;
  validationFailReason?: string;
  disabled?: boolean;
  onRemove: () => void;
}

const Chip = ({
  value,
  validationFailReason,
  disabled,
  onRemove,
}: ChipProps) => {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-sm font-medium",
        validationFailReason
          ? "bg-destructive/10 text-destructive ring-1 ring-destructive/40"
          : "bg-secondary text-secondary-foreground dark:bg-secondary/50",
      )}
    >
      {validationFailReason && (
        <Tooltip>
          <TooltipTrigger aria-label={`${value}: ${validationFailReason}`}>
            <TriangleAlertIcon className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent className="max-w-3xs">
            {validationFailReason}
          </TooltipContent>
        </Tooltip>
      )}
      <span>{value}</span>
      {!disabled && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${value}`}
          className={cn(
            "inline-flex size-3.5 items-center justify-center rounded-xs opacity-70 hover:opacity-100 transition-opacity",
            "focus:outline-none focus:ring-1 focus:ring-ring/50",
          )}
        >
          <XIcon className="size-2.5" />
        </button>
      )}
    </div>
  );
};

TagSelector.displayName = "TagSelector";

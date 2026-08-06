// Picks the category of a parameter class from all those among the loaded
// libraries. Per the standard, only categories defined in ESTA libraries are
// permitted. We allow extra categories with a warning, mostly to allow library
// editing when writing new standards :)

import { useMemo, useState } from "react";
import { CheckIcon, ChevronDownIcon, TriangleAlertIcon } from "lucide-react";
import {
  CategoryCatalog,
  FullCategoryId,
  categoryAncestry,
  firstInvalidIdentifierCharacter,
  formatCategoryPath,
  isFullCategoryId,
  localizeCategory,
  localizeCategoryPath,
} from "codex/categories";
import { describeCharacter } from "utils/inputValidation";
import { cn } from "utils/utils";
import { Button } from "./scn-ui/Button";
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

const UNRECOGNIZED_CATEGORY_LABEL = "Unrecognized category";

const UNRECOGNIZED_CATEGORY_WARNING =
  "No loaded library defines this category. The standard reserves categories " +
  "to published ESTA libraries, so other applications may not recognize it.";

interface CategoryFieldProps {
  id?: string;
  value: FullCategoryId;
  catalog: CategoryCatalog;
  locale: string;
  onValueChange: (category: FullCategoryId) => void;
}

// One category in a form that can be used by this component.
interface CategoryOption {
  id: FullCategoryId;
  /** The localized path, such as "Color › CIE-1931 › CIE XY". */
  path: string;
  /**
   * The localized name of the root (first segment), which the options are
   * grouped under.
   */
  group: string;
  /** The text a search is matched against. */
  haystack: string;
}

export const CategoryField = ({
  id,
  value,
  catalog,
  locale,
  onValueChange,
}: CategoryFieldProps) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const options = useMemo(
    () => buildOptions(catalog, locale),
    [catalog, locale],
  );

  const trimmedQuery = query.trim();

  const matches = useMemo(() => {
    const needle = trimmedQuery.toLowerCase();
    if (!needle) return options;
    return options.filter((option) => option.haystack.includes(needle));
  }, [options, trimmedQuery]);

  // The set of top level sections (first segment of the category)
  // We rely on the category ordering guarantee here.
  const sections = useMemo(() => {
    const result: { group: string; options: CategoryOption[] }[] = [];

    for (const option of matches) {
      const section = result[result.length - 1];
      if (section && section.group === option.group) {
        section.options.push(option);
      } else {
        result.push({ group: option.group, options: [option] });
      }
    }

    return result;
  }, [matches]);

  const known = useMemo(
    () => new Set(catalog.categories.map((category) => category.id)),
    [catalog],
  );

  const custom = customCategoryFor(trimmedQuery, known);
  const unrecognized = value !== "" && !known.has(value);

  const choose = (category: FullCategoryId) => {
    onValueChange(category);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-3xs justify-start font-normal"
            title={value || undefined}
          >
            <span className="truncate">
              {value
                ? formatCategoryPath(
                    localizeCategoryPath(catalog.localizations, value, locale),
                  )
                : "Select a category..."}
            </span>
            <ChevronDownIcon className="ml-auto size-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-(--radix-popover-trigger-width) min-w-xs"
          align="start"
          // Ensures that the popover is still scrollable when inside a Dialog
          onWheel={(event) => event.stopPropagation()}
        >
          <Command shouldFilter={false}>
            <CommandInput
              value={query}
              onValueChange={setQuery}
              aria-label="Search categories"
              placeholder="Search categories..."
            />
            <CommandList>
              {matches.length === 0 && !custom.offer && (
                <CommandEmpty>{custom.reason ?? "No matches."}</CommandEmpty>
              )}
              {sections.map((section) => (
                <CommandGroup key={section.group} heading={section.group}>
                  {section.options.map((option) => (
                    <CommandItem
                      key={option.id}
                      value={itemValue(trimmedQuery, option.id)}
                      onSelect={() => choose(option.id)}
                    >
                      <CheckIcon
                        className={cn(
                          "size-4 shrink-0",
                          option.id !== value && "invisible",
                        )}
                      />
                      <div className="min-w-0">
                        <div className="truncate">{option.path}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {option.id}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
              {custom.offer && (
                <CommandGroup>
                  <CommandItem
                    value={itemValue(trimmedQuery, custom.offer)}
                    onSelect={() => choose(custom.offer!)}
                  >
                    <TriangleAlertIcon className="size-4 shrink-0 text-destructive" />
                    <span className="truncate">
                      Use &quot;{custom.offer}&quot; as a custom category
                    </span>
                  </CommandItem>
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    {UNRECOGNIZED_CATEGORY_WARNING}
                  </div>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {unrecognized && (
        <Tooltip>
          <TooltipTrigger aria-label={UNRECOGNIZED_CATEGORY_LABEL}>
            <TriangleAlertIcon className="size-4 text-destructive" />
          </TooltipTrigger>
          <TooltipContent className="max-w-3xs">
            {UNRECOGNIZED_CATEGORY_WARNING}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Prefix each item value with the current search query, so that cmdk reads it
// as a new set of values each time the search changes. This is necessary due to
// us driving cmdk manually in this component.
function itemValue(query: string, value: string): string {
  return `${query}\0${value}`;
}

function buildOptions(
  catalog: CategoryCatalog,
  locale: string,
): CategoryOption[] {
  return catalog.categories.map((category) => {
    const path = formatCategoryPath(
      localizeCategoryPath(catalog.localizations, category.id, locale),
    );
    const root = categoryAncestry(category.id)[0];

    return {
      id: category.id,
      path,
      group: localizeCategory(catalog.localizations, root, locale).value,
      // Both the localized path form and the raw ID.
      haystack: `${path}\0${category.id}`.toLowerCase(),
    };
  });
}

// Determine whether a query should be offered as a custom category; if not,
// gives a reason (the string is invalid)
function customCategoryFor(
  query: string,
  known: Set<FullCategoryId>,
): { offer?: FullCategoryId; reason?: string } {
  if (!query || known.has(query)) {
    return {};
  }

  if (isFullCategoryId(query)) {
    return { offer: query };
  }

  const invalidCharacter = firstInvalidIdentifierCharacter(
    query.replaceAll("/", ""),
  );

  return {
    reason: invalidCharacter
      ? `A category must not contain ${describeCharacter(invalidCharacter)}.`
      : "No matches.",
  };
}

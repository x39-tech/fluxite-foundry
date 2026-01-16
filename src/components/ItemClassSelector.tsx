import { useState, useMemo, JSX } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ListBulletIcon,
} from "@heroicons/react/24/solid";
import { Library } from "@cpwg-community/delver";
import {
  ImportedItemClass,
  ItemClassWithId,
  LocalItemClassWithId,
  CodexDatabase,
  getItemClassName,
  getItemClassNameOrId,
  getLibraryFriendlyName,
  getNewestVersionOfEachLibrary,
} from "codex/codexDatabase";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "components/scn-ui/Popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "components/scn-ui/Command";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { Button, ButtonProps } from "components/scn-ui/Button";
import { useTextWidth } from "hooks/useTextWidth";
import { useCurrentLocale } from "app/store";
import { useLocalizations } from "features/deviceClassEditor/state";
import { CodexId } from "app/persistentState";

interface ItemClassSelectorProps extends ButtonProps {
  selectedClass?: ItemClassWithId;
  localItems?: LocalItemClassWithId[];
  librarySelector: (library: Library) => [string, ImportedItemClass][];
  "aria-labelledby"?: string;
  onSelectedClassChanged: (newClass?: ItemClassWithId) => void;
  tooltipRenderer: (item: ItemClassWithId) => JSX.Element;
  database: CodexDatabase;
}

// TODO: handle local items
export function ItemClassSelector({
  selectedClass,
  librarySelector,
  onSelectedClassChanged,
  tooltipRenderer,
  database,
  ...props
}: ItemClassSelectorProps) {
  const [open, setOpen] = useState(false);
  const locale = useCurrentLocale();
  const localizations = useLocalizations();

  const libraries = useMemo(
    () =>
      getNewestVersionOfEachLibrary(database).sort((a, b) =>
        getLibraryFriendlyName(a, locale).value.localeCompare(
          getLibraryFriendlyName(b, locale).value,
        ),
      ),
    [database],
  );

  // Calculate all possible button texts for text width measurement
  const allItemClassNames = useMemo(
    () =>
      libraries.flatMap((library) =>
        librarySelector(library).map(([id, cls]) => {
          const itemClassWithId: ItemClassWithId = {
            ...cls,
            type: "imported",
            codexId: CodexId(id),
            libraryId: library.id,
            libraryVersion: library.version,
          };
          return getItemClassNameOrId(
            itemClassWithId,
            database,
            localizations,
            locale,
          ).value;
        }),
      ),
    [libraries, database],
  );

  const placeholderText = "Select an item class...";
  const allPossibleTexts = useMemo(
    () => [...allItemClassNames, placeholderText],
    [allItemClassNames],
  );

  const { width: buttonWidth, MeasuringElement } = useTextWidth({
    texts: allPossibleTexts,
    extraWidth: 96, // Icons + gaps padding
  });

  const commandGroups = useMemo(
    () =>
      libraries
        .filter((library) => librarySelector(library).length > 0)
        .map((library) => (
          <CommandGroup
            key={library.id}
            heading={getLibraryFriendlyName(library, locale).value}
          >
            {librarySelector(library).map(([id, cls]) => {
              const itemClassWithId: ItemClassWithId = {
                ...cls,
                type: "imported",
                codexId: CodexId(id),
                libraryId: library.id,
                libraryVersion: library.version,
              };

              return (
                <Tooltip key={id}>
                  <TooltipTrigger className="block w-full">
                    <CommandItem
                      value={id}
                      onSelect={() => {
                        onSelectedClassChanged(
                          id === selectedClass?.codexId
                            ? undefined
                            : itemClassWithId,
                        );
                        setOpen(false);
                      }}
                      className="flex"
                    >
                      <CheckIcon
                        className={
                          id === selectedClass?.codexId ? "" : "opacity-0"
                        }
                      />
                      {
                        getItemClassName(
                          itemClassWithId,
                          database,
                          localizations,
                          locale,
                        )?.value
                      }
                      <div className="flex-grow" />
                      <span className="text-gray-500 dark:text-gray-400">
                        {id}
                      </span>
                    </CommandItem>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {tooltipRenderer(itemClassWithId)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </CommandGroup>
        )),
    [
      libraries,
      database,
      selectedClass,
      onSelectedClassChanged,
      tooltipRenderer,
    ],
  );

  return (
    <>
      {MeasuringElement}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="gap-3"
            style={{ width: buttonWidth > 0 ? `${buttonWidth}px` : "auto" }}
            {...props}
          >
            <ListBulletIcon />
            {selectedClass
              ? getItemClassNameOrId(
                  selectedClass,
                  database,
                  localizations,
                  locale,
                ).value
              : placeholderText}
            <div className="flex-grow" />
            <ChevronDownIcon />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 w-auto min-w-[200px] max-w-[500px]"
          // Ensures that the popover is still scrollable when inside a Dialog
          onWheel={(e) => e.stopPropagation()}
        >
          <Command>
            <CommandInput placeholder="Search item classes..." />
            <CommandList>
              <CommandEmpty>No item class found.</CommandEmpty>
              {commandGroups}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

import { useState, useMemo, JSX } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  ListBulletIcon,
} from "@heroicons/react/24/solid";
import {
  ParameterClassWithId,
  UdrDatabase,
  getItemClassName,
  getItemClassNameOrId,
  getLibraryFriendlyName,
  getNewestVersionOfEachLibrary,
} from "udr/udrDatabase";
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
import { Button } from "components/scn-ui/Button";
import { useTextWidth } from "hooks/useTextWidth";

interface ParameterClassSelectorProps {
  selectedClass?: ParameterClassWithId;
  "aria-labelledby"?: string;
  onSelectedClassChanged: (newClass?: ParameterClassWithId) => void;
  tooltipRenderer: (item: ParameterClassWithId) => JSX.Element;
  database: UdrDatabase;
}

export const ParameterClassSelector = ({
  selectedClass,
  "aria-labelledby": ariaLabelledBy,
  onSelectedClassChanged,
  tooltipRenderer,
  database,
}: ParameterClassSelectorProps) => {
  const [open, setOpen] = useState(false);

  const libraries = useMemo(
    () =>
      getNewestVersionOfEachLibrary(database).sort((a, b) =>
        getLibraryFriendlyName(a).localeCompare(getLibraryFriendlyName(b)),
      ),
    [database],
  );

  // Calculate all possible button texts for text width measurement
  const allItemClassNames = useMemo(
    () =>
      libraries.flatMap((library) =>
        Object.entries(library.parameterClasses).map(([id, cls]) => {
          const itemClassWithId = {
            ...cls,
            id,
            libraryId: library.id,
            libraryVersion: library.version,
          };
          return getItemClassNameOrId(database, itemClassWithId);
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
        .filter((library) => Object.keys(library.parameterClasses).length > 0)
        .map((library) => (
          <CommandGroup
            key={library.id}
            heading={getLibraryFriendlyName(library)}
          >
            {Object.entries(library.parameterClasses).map(([id, cls]) => {
              const itemClassWithId = {
                ...cls,
                id,
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
                          id === selectedClass?.id
                            ? undefined
                            : itemClassWithId,
                        );
                        setOpen(false);
                      }}
                      className="flex"
                    >
                      <CheckIcon
                        className={id === selectedClass?.id ? "" : "opacity-0"}
                      />
                      {getItemClassName(database, itemClassWithId)}
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
            aria-labelledby={ariaLabelledBy}
            className="gap-3"
            style={{ width: buttonWidth > 0 ? `${buttonWidth}px` : "auto" }}
          >
            <ListBulletIcon />
            {selectedClass
              ? getItemClassNameOrId(database, selectedClass)
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
};

import { useState, useMemo, JSX } from "react";
import { CheckIcon, ChevronDownIcon, ListIcon } from "lucide-react";
import { ClassKind, ImportedLibrary, LibraryStore } from "codex/library";
import {
  getLibraryFriendlyName,
  getNewestVersionOfEachLibrary,
} from "codex/libraryStore";
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
import { localize } from "utils/localizationUtils";
import { CodexId, EntityId } from "app/persistentState";
import { ResolvedClassRef } from "features/deviceClassEditor/classResolution";

export interface SelectedItemClass {
  libraryId: string;
  codexId: CodexId;
  resolved: ResolvedClassRef;
}

interface ItemClassSelectorProps extends ButtonProps {
  selectedClass?: SelectedItemClass;
  kind: ClassKind;
  "aria-labelledby"?: string;
  onSelectedClassChanged: (newClass?: SelectedItemClass) => void;
  tooltipRenderer: (item: SelectedItemClass) => JSX.Element;
  libraryStore: LibraryStore;
}

interface ItemClassOption {
  key: string;
  name: string;
  selection: SelectedItemClass;
}

// TODO: offer the classes defined in the device class's own library too
export function ItemClassSelector({
  selectedClass,
  kind,
  onSelectedClassChanged,
  tooltipRenderer,
  libraryStore,
  ...props
}: ItemClassSelectorProps) {
  const [open, setOpen] = useState(false);
  const locale = useCurrentLocale();

  const libraries = useMemo(
    () =>
      getNewestVersionOfEachLibrary(libraryStore).sort((a, b) =>
        getLibraryFriendlyName(a, locale).value.localeCompare(
          getLibraryFriendlyName(b, locale).value,
        ),
      ),
    [libraryStore, locale],
  );

  const optionsByLibrary = useMemo(
    () =>
      libraries.map((library) => ({
        library,
        options: itemClassOptions(library, kind, locale),
      })),
    [libraries, kind, locale],
  );

  const placeholderText = "Select an item class...";
  const allPossibleTexts = useMemo(
    () => [
      ...optionsByLibrary.flatMap(({ options }) => options.map((o) => o.name)),
      placeholderText,
    ],
    [optionsByLibrary],
  );

  const { width: buttonWidth, MeasuringElement } = useTextWidth({
    texts: allPossibleTexts,
    extraWidth: 96, // Icons + gaps padding
  });

  const commandGroups = useMemo(
    () =>
      optionsByLibrary
        .filter(({ options }) => options.length > 0)
        .map(({ library, options }) => (
          <CommandGroup
            key={library.id}
            heading={getLibraryFriendlyName(library, locale).value}
          >
            {options.map((option) => {
              const isSelected =
                option.selection.libraryId === selectedClass?.libraryId &&
                option.selection.codexId === selectedClass?.codexId;

              return (
                <Tooltip key={option.key}>
                  <TooltipTrigger className="block w-full">
                    <CommandItem
                      value={option.selection.codexId}
                      onSelect={() => {
                        onSelectedClassChanged(
                          isSelected ? undefined : option.selection,
                        );
                        setOpen(false);
                      }}
                      className="flex"
                    >
                      <CheckIcon className={isSelected ? "" : "opacity-0"} />
                      {option.name}
                      <div className="flex-grow" />
                      <span className="text-gray-500 dark:text-gray-400">
                        {option.selection.codexId}
                      </span>
                    </CommandItem>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    {tooltipRenderer(option.selection)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </CommandGroup>
        )),
    [
      optionsByLibrary,
      locale,
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
            <ListIcon />
            {selectedClass
              ? selectedClassName(selectedClass, kind, locale)
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

function itemClassOptions(
  library: ImportedLibrary,
  kind: ClassKind,
  locale: string,
): ItemClassOption[] {
  return Object.entries(library.library[kind]).map(([id, cls]) => {
    const classId = EntityId(id);
    return {
      key: `${library.id}/${cls.codexId}`,
      name: localize(library.library.localizations, cls.localized.name, locale)
        .value,
      selection: {
        libraryId: library.id,
        codexId: cls.codexId,
        resolved: {
          library: library.library,
          classId,
          index: library.index,
        },
      },
    };
  });
}

function selectedClassName(
  selected: SelectedItemClass,
  kind: ClassKind,
  locale: string,
): string {
  const { library, classId } = selected.resolved;
  const cls = library[kind][classId];
  if (!cls) {
    return selected.codexId;
  }
  return localize(library.localizations, cls.localized.name, locale).value;
}

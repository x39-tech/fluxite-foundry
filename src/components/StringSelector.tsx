import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useState } from "react";
import { ChevronDownIcon, ListIcon } from "lucide-react";
import { useTextWidth } from "hooks/useTextWidth";
import { Button } from "./scn-ui/Button";
import { Popover, PopoverContent, PopoverTrigger } from "./scn-ui/Popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "./scn-ui/Command";
import { cn } from "utils/utils";

const SELECT_ITEM = msg({
  id: "stringSelector.placeholder",
  message: "Select an item...",
});

interface StringSelectorProps {
  className?: string;
  items: string[];
  displayNames?: string[];
  selectedItem?: string;
  placeholderText?: MessageDescriptor;
  onSelectedItemChanged: (newItem: string) => void;
}

export const StringSelector = ({
  className,
  items,
  displayNames,
  selectedItem,
  placeholderText,
  onSelectedItemChanged,
}: StringSelectorProps) => {
  const { _ } = useLingui();

  const [open, setOpen] = useState(false);
  const itemIndex = selectedItem ? items.indexOf(selectedItem) : -1;
  const buttonDisplayName =
    displayNames && itemIndex != -1 ? displayNames[itemIndex] : selectedItem;

  const { width: buttonWidth, MeasuringElement } = useTextWidth({
    texts: displayNames || items,
    extraWidth: 96, // Icons + gaps padding
  });

  return (
    <>
      {MeasuringElement}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            className={cn("gap-3", className)}
            size="sm"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            style={{ width: buttonWidth > 0 ? `${buttonWidth}px` : "auto" }}
            disabled={items.length === 0}
          >
            <ListIcon />
            {buttonDisplayName || _(placeholderText ?? SELECT_ITEM)}
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
            <CommandInput />
            <CommandList>
              {items.map((item, index) => (
                <CommandItem
                  key={index}
                  value={item}
                  onSelect={() => {
                    onSelectedItemChanged(item);
                    setOpen(false);
                  }}
                >
                  {displayNames && displayNames[index]
                    ? displayNames[index]
                    : item}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
};

import { ItemRenderer, Select } from "@blueprintjs/select";
import { useParameters } from "features/deviceClassEditor/parametersEditor/state";
import { RenderError } from "./RenderError";
import { Button, MenuItem } from "@blueprintjs/core";

interface StringSelectorProps {
  className?: string;
  items: string[];
  displayNames?: string[];
  selectedItem?: string;
  placeholderText?: string;
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
  const StringSelect = Select<string>;

  const itemIndex = selectedItem ? items.indexOf(selectedItem) : -1;
  const buttonDisplayName =
    displayNames && itemIndex != -1 ? displayNames[itemIndex] : selectedItem;

  const parameters = useParameters();
  if (!parameters) {
    return <RenderError />;
  }

  const itemRenderer: ItemRenderer<string> = (
    item,
    { handleClick, handleFocus, index, modifiers },
  ) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    const text =
      displayNames && displayNames[index] ? displayNames[index] : item;

    return (
      <MenuItem
        active={modifiers.active}
        disabled={modifiers.disabled}
        key={index}
        onClick={handleClick}
        onFocus={handleFocus}
        roleStructure="listoption"
        text={text}
      />
    );
  };

  return (
    <StringSelect
      items={items}
      itemRenderer={itemRenderer}
      onItemSelect={onSelectedItemChanged}
    >
      <Button
        className={className}
        icon="property"
        rightIcon="caret-down"
        fill={true}
        text={buttonDisplayName || placeholderText || "Select an item..."}
      />
    </StringSelect>
  );
};

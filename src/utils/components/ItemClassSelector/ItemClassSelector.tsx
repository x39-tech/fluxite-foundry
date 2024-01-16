import {
  ItemListRenderer,
  ItemPredicate,
  ItemRenderer,
  Select2,
  ItemModifiers,
} from "@blueprintjs/select";
import {
  ItemClassWithId,
  UdrDatabase,
  getFullyQualifiedId,
  getItemClassName,
  getLibraryFriendlyName,
} from "udr/udrDatabase";
import { Button, ButtonProps } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import "./ItemClassSelector.scss";

interface ItemClassSelectorProps<T extends ItemClassWithId> {
  itemClasses: T[];
  selectedClass?: T;
  "aria-labelledby"?: string;
  onSelectedClassChanged: (newClass: T) => void;
  tooltipRenderer: (item: T) => JSX.Element;
  database: UdrDatabase;
}

export const ItemClassSelector = <T extends ItemClassWithId>({
  itemClasses,
  selectedClass,
  "aria-labelledby": ariaLabelledBy,
  onSelectedClassChanged,
  tooltipRenderer,
  database,
}: ItemClassSelectorProps<T>) => {
  const ItemClassSelect = Select2<T>;

  const selectedFQID = selectedClass ? getFullyQualifiedId(selectedClass) : "";

  const itemRenderer: ItemRenderer<T> = (item, { handleClick, modifiers }) => {
    if (!modifiers.matchesPredicate) {
      return null;
    }

    const itemFQID = getFullyQualifiedId(item);

    return (
      <Popover2
        content={tooltipRenderer(item)}
        usePortal={false}
        position="right"
        minimal={true}
        interactionKind="hover"
        hoverOpenDelay={0}
        hoverCloseDelay={0}
        key={`${item.libraryId}/${item.id}`}
      >
        <Button
          minimal={true}
          fill={true}
          alignText="left"
          {...getItemRenderProps(item, handleClick, modifiers, database)}
          icon={selectedFQID === itemFQID ? "tick" : "blank"}
        />
      </Popover2>
    );
  };

  const itemPredicate: ItemPredicate<T> = (query, itemClass) => {
    const lcQuery = query.toLowerCase();
    const matches = (str?: string) => {
      return str ? str.toLowerCase().indexOf(lcQuery) >= 0 : false;
    };

    return (
      matches(itemClass.id) ||
      matches(itemClass.libraryId) ||
      matches(getItemClassName(database, itemClass))
    );
  };

  const renderMenu: ItemListRenderer<T> = ({
    items,
    renderItem,
    menuProps,
  }) => {
    const renderedItems: JSX.Element[] = [];
    let currentLibrary = "";

    for (const [index, item] of items.entries()) {
      const renderedItem = renderItem(item, index);
      if (renderedItem != null) {
        if (item.libraryId !== currentLibrary) {
          currentLibrary = item.libraryId;
          renderedItems.push(
            <Button key={currentLibrary} disabled={true} alignText="left">
              {getLibraryFriendlyName(database, currentLibrary)}
            </Button>,
          );
        }
        renderedItems.push(renderedItem);
      }
    }

    return (
      <div
        className="item-class-list"
        {...(menuProps as React.HTMLAttributes<HTMLDivElement> | undefined)}
      >
        {renderedItems}
      </div>
    );
  };

  return (
    <ItemClassSelect
      items={itemClasses}
      itemRenderer={itemRenderer}
      itemListRenderer={renderMenu}
      itemPredicate={itemPredicate}
      onItemSelect={onSelectedClassChanged}
      fill={true}
    >
      <Button
        icon="property"
        rightIcon="caret-down"
        fill={true}
        aria-labelledby={ariaLabelledBy}
        text={
          selectedClass
            ? getItemClassName(database, selectedClass) ||
              "Select an item class..."
            : "Select an item class..."
        }
      />
    </ItemClassSelect>
  );
};

function getItemRenderProps(
  item: ItemClassWithId,
  handleClick: React.MouseEventHandler,
  modifiers: ItemModifiers,
  database: UdrDatabase,
): ButtonProps & React.Attributes {
  return {
    active: modifiers.active,
    disabled: modifiers.disabled,
    onClick: handleClick,
    // onFocus: handleFocus,
    text: (
      <>
        <span>{getItemClassName(database, item)}</span>
        <span className="item-class-selector-id">{item.id}</span>
      </>
    ),
  };
}

import {
  IItemRendererProps,
  ItemListRenderer,
  ItemPredicate,
  ItemRenderer,
  Select2,
} from "@blueprintjs/select";
import {
  getQualifiedIdFriendlyName,
  ItemClassWithId,
} from "utils/itemDatabase";
import { Button, ButtonProps } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import "./ItemClassSelector.scss";
import { ItemClass } from "udr/objects/itemClass";

export interface ItemClassSelectorProps<T extends ItemClassWithId & ItemClass> {
  itemClasses: T[];
  selectedClass?: T;
  onSelectedClassChanged: (newClass: T) => void;
  tooltipRenderer: (item: T) => JSX.Element;
}

export const ItemClassSelector = <T extends ItemClassWithId & ItemClass>({
  itemClasses,
  selectedClass,
  onSelectedClassChanged,
  tooltipRenderer,
}: ItemClassSelectorProps<T>) => {
  const ItemClassSelect = Select2.ofType<T>();

  const itemRenderer: ItemRenderer<T> = (item, props) => {
    if (!props.modifiers.matchesPredicate) {
      return null;
    }

    return (
      <Popover2
        content={tooltipRenderer(item)}
        usePortal={false}
        position="right"
        minimal={true}
        interactionKind="hover"
        hoverOpenDelay={0}
        hoverCloseDelay={0}
        key={`${item.qualifiedId}/${item.category}/${item.identifier}`}
      >
        <Button
          minimal={true}
          fill={true}
          alignText="left"
          {...getItemRenderProps(item, props)}
          icon={
            selectedClass?.fullyQualifiedId === item.fullyQualifiedId
              ? "tick"
              : "blank"
          }
        />
      </Popover2>
    );
  };

  const itemPredicate: ItemPredicate<T> = (query, itemClass) => {
    const lcQuery = query.toLowerCase();
    const matches = (str: string) => {
      return str.toLowerCase().indexOf(lcQuery) >= 0;
    };

    return (
      matches(itemClass.identifier) ||
      matches(itemClass.name) ||
      matches(itemClass.category) ||
      matches(itemClass.fullyQualifiedId)
    );
  };

  const renderMenu: ItemListRenderer<T> = ({
    items,
    itemsParentRef,
    query,
    renderItem,
    menuProps,
  }) => {
    let renderedItems: JSX.Element[] = [];
    let currentLibrary = "";

    for (const [index, item] of items.entries()) {
      const renderedItem = renderItem(item, index);
      if (renderedItem != null) {
        if (item.qualifiedId !== currentLibrary) {
          currentLibrary = item.qualifiedId;
          renderedItems.push(
            <Button key={currentLibrary} disabled={true} alignText="left">
              {getQualifiedIdFriendlyName(currentLibrary)}
            </Button>
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
        text={
          selectedClass
            ? selectedClass.name || "Select an item class..."
            : "Select an item class..."
        }
      />
    </ItemClassSelect>
  );
};

function getItemRenderProps(
  item: ItemClass,
  { handleClick, handleFocus, modifiers }: IItemRendererProps
): ButtonProps & React.Attributes {
  return {
    active: modifiers.active,
    disabled: modifiers.disabled,
    onClick: handleClick,
    // onFocus: handleFocus,
    text: (
      <>
        <span>{item.name}</span>
        <span className="item-class-selector-category">{item.category}</span>
      </>
    ),
  };
}

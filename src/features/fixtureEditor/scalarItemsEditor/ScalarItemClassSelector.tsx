import {
  IItemRendererProps,
  ItemListRenderer,
  ItemPredicate,
  ItemRenderer,
  Select2,
} from "@blueprintjs/select";
import {
  getAllScalarItemsWithIds,
  getQualifiedIdFriendlyName,
  lookupScalarItemClass,
  ScalarItemClassWithId,
} from "utils/scalarItemDatabase";
import { Button, ButtonProps } from "@blueprintjs/core";
import "./ScalarItemClassSelector.scss";
import React from "react";
import { Popover2 } from "@blueprintjs/popover2";
import { ScalarItemClassDisplay } from "utils/components/ScalarItemClassDisplay/ScalarItemClassDisplay";

const ScalarItemClassSelect = Select2.ofType<ScalarItemClassWithId>();

export interface ScalarItemClassSelectorProps {
  selectedClass: string;
  onSelectedClassChanged: (newClass: string) => void;
}

export const ScalarItemClassSelector: React.FC<
  ScalarItemClassSelectorProps
> = ({ selectedClass, onSelectedClassChanged }) => {
  const itemRenderer: ItemRenderer<ScalarItemClassWithId> = (item, props) => {
    if (!props.modifiers.matchesPredicate) {
      return null;
    }

    return (
      <Popover2
        content={<ScalarItemClassDisplay udr={item} />}
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
          {...getScalarItemRenderProps(item, props)}
          icon={selectedClass === item.fullyQualifiedId ? "tick" : "blank"}
        />
      </Popover2>
    );
  };

  const itemPredicate: ItemPredicate<ScalarItemClassWithId> = (
    query,
    itemClass
  ) => {
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

  const renderMenu: ItemListRenderer<ScalarItemClassWithId> = ({
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
        className="scalar-item-class-list"
        {...(menuProps as React.HTMLAttributes<HTMLDivElement> | undefined)}
      >
        {renderedItems}
      </div>
    );
  };

  return (
    <ScalarItemClassSelect
      items={getAllScalarItemsWithIds()}
      itemRenderer={itemRenderer}
      itemListRenderer={renderMenu}
      itemPredicate={itemPredicate}
      onItemSelect={(newItemClass) =>
        onSelectedClassChanged(newItemClass.fullyQualifiedId)
      }
      fill={true}
    >
      <Button
        icon="property"
        rightIcon="caret-down"
        fill={true}
        text={
          selectedClass
            ? lookupScalarItemClass(selectedClass)?.name ||
              "Select an item class..."
            : "Select an item class..."
        }
      />
    </ScalarItemClassSelect>
  );
};

export function getDefaultSelectedClass(): string {
  return getAllScalarItemsWithIds()[0].fullyQualifiedId;
}

function getScalarItemRenderProps(
  item: ScalarItemClassWithId,
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
        <span className="scalar-item-class-selector-category">
          {item.category}
        </span>
      </>
    ),
  };
}

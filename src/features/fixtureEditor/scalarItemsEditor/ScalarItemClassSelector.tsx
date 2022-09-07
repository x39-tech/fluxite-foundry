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
import { Button, ButtonProps, HTMLTable } from "@blueprintjs/core";
import "./ScalarItemClassSelector.scss";
import React from "react";
import { Popover2 } from "@blueprintjs/popover2";

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
        content={getClassTooltipContent(item)}
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

function getClassTooltipContent(item: ScalarItemClassWithId): JSX.Element {
  // TODO: Revisit this formatting, ideally tables should be sized reasonably to their contents
  return (
    <HTMLTable striped condensed style={{ width: "400px" }}>
      <colgroup>
        <col span={1} style={{ width: "30%" }} />
        <col span={1} />
      </colgroup>
      <thead>
        <tr>
          <th colSpan={2}>{item.name}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Description</td>
          <td>{item.description}</td>
        </tr>
        <tr>
          <td>Category</td>
          <td>{`${item.category}`}</td>
        </tr>
        <tr>
          <td>ID</td>
          <td>{item.identifier}</td>
        </tr>
        <tr>
          <td>Data Type</td>
          <td>{item.dataType}</td>
        </tr>
        <tr>
          <td>Unit</td>
          <td>{item.unit || "N/A"}</td>
        </tr>
        {item.default !== undefined ? (
          <tr>
            <td>Default Value</td>
            <td>{item.default}</td>
          </tr>
        ) : (
          <></>
        )}
      </tbody>
    </HTMLTable>
  );
}

import { IItemRendererProps, ItemRenderer, Select2 } from "@blueprintjs/select";
import { MenuItem2, MenuItem2Props } from "@blueprintjs/popover2";
import {
  getAllScalarItemsWithIds,
  getQualifiedIdFriendlyName,
  lookupScalarItemClass,
  ScalarItemClassWithId,
} from "utils/scalarItemDatabase";
import { Button } from "@blueprintjs/core";

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
      <MenuItem2
        {...getScalarItemRenderProps(item, props)}
        selected={selectedClass === item.fullyQualifiedId}
      />
    );
  };

  return (
    <ScalarItemClassSelect
      items={getAllScalarItemsWithIds()}
      itemRenderer={itemRenderer}
      onItemSelect={(newItemClass) =>
        onSelectedClassChanged(newItemClass.fullyQualifiedId)
      }
    >
      <Button
        icon="property"
        rightIcon="caret-down"
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
): MenuItem2Props & React.Attributes & React.HTMLAttributes<HTMLAnchorElement> {
  return {
    active: modifiers.active,
    disabled: modifiers.disabled,
    key: `${item.qualifiedId}/${item.category}/${item.identifier}`,
    label: getQualifiedIdFriendlyName(item.qualifiedId) || item.qualifiedId,
    onClick: handleClick,
    onFocus: handleFocus,
    roleStructure: "listoption",
    text: item.name,
  };
}

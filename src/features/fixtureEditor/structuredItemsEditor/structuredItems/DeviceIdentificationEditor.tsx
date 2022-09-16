import produce from "immer";
import { Colors } from "@blueprintjs/core";
import { DispatchOnChangeFactory } from "utils/dispatchOnChangeFactory";
import { DeviceIdentification } from "udr/libraries/core/structuredItems/deviceIdentification";
import {
  DeviceCategory,
  DeviceSubcategory,
  deviceSubCategoryMap,
} from "udr/util/enums";
import { useAppDispatch } from "app/hooks";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { SelectTableRow } from "utils/components/EditorFields/SelectField";
import { TagInputTableRow } from "utils/components/EditorFields/TagInputField";
import { ItemEditor } from "utils/components/ItemEditor/ItemEditor";
import {
  structuredItemDeleted,
  structuredItemUpdated,
} from "../structuredItemsEditorSlice";
import "./StructuredItemEditor.css";

export interface DeviceIdentificationEditorProps {
  id: string;
  udr: DeviceIdentification;
}

export const DeviceIdentificationEditor: React.FC<
  DeviceIdentificationEditorProps
> = ({ id, udr }) => {
  const dispatch = useAppDispatch();

  const onChangeFactory = new DispatchOnChangeFactory(
    udr,
    (newValue, changeRecipe) => {
      dispatch(
        structuredItemUpdated({
          id,
          newValue: produce(udr, (draft) => {
            changeRecipe(draft, newValue);
          }),
        })
      );
    }
  );

  return (
    <ItemEditor
      expanded
      title="Device Identification"
      backgroundColor={{ light: Colors.BLUE5, dark: Colors.BLUE1 }}
      onDelete={() => dispatch(structuredItemDeleted(id))}
    >
      <div className="structured-item-collapse-body">
        <SimplePropsTable name="Manufacturer Information">
          <TextEditorTableRow
            label="Manufacturer Name"
            defaultValue={udr.manufacturer.name}
            onValueChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.manufacturer.name = newValue;
            })}
          />
          <TextEditorTableRow
            label="Manufacturer URL"
            defaultValue={udr.manufacturer.url}
            onValueChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.manufacturer.url = newValue;
            })}
          />
          <TextEditorTableRow
            label="Manufacturer ESTA ID"
            defaultValue={udr.manufacturer.estaId}
            onValueChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.manufacturer.estaId = newValue;
            })}
          />
        </SimplePropsTable>
        <SimplePropsTable name="Model Information">
          <TextEditorTableRow
            label="Model Name"
            defaultValue={udr.model.name}
            onValueChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.model.name = newValue;
            })}
          />
          <TextEditorTableRow
            label="Product Identifier"
            defaultValue={udr.model.productIdentifier}
            onValueChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.model.productIdentifier = newValue;
            })}
          />
          <SelectTableRow
            label="Category"
            values={Object.values(DeviceCategory)}
            selectedValue={udr.model.category}
            onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.model.category = newValue as DeviceCategory;
              draft.model.subcategory =
                deviceSubCategoryMap[newValue as DeviceCategory][0];
            })}
          />
          <SelectTableRow
            label="Subcategory"
            values={deviceSubCategoryMap[udr.model.category]}
            selectedValue={udr.model.subcategory}
            onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.model.subcategory = newValue as DeviceSubcategory;
            })}
          />
        </SimplePropsTable>
        <SimplePropsTable name="Compatibility">
          <TagInputTableRow
            label="Firmware Versions"
            values={udr.compatibility?.firmwareVersions || []}
            onValuesChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.compatibility = {
                firmwareVersions: newValue,
              };
            })}
          />
        </SimplePropsTable>
      </div>
    </ItemEditor>
  );
};

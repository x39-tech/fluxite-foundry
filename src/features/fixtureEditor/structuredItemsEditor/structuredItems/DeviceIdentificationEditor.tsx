// import { Select2 } from "@blueprintjs/select"; TODO figure out how to use in place of HTMLSelect for nicer styling
import { StructuredItemFieldFactory } from "features/fixtureEditor/structuredItemsEditor/structuredItemFieldFactory";
import { DeviceIdentification } from "udr/objects/structuredItems/device_identification";
import {
  DeviceCategory,
  DeviceSubCategory,
  deviceSubCategoryMap,
} from "udr/util/enums";
import { useAppDispatch } from "app/hooks";
import { SimplePropsTable } from "./SimplePropsTable";
import "./DeviceIdentificationEditor.scss";
import "./StructuredItemEditor.css";

export interface DeviceIdentificationEditorProps {
  udr: DeviceIdentification;
}

export const DeviceIdentificationEditor: React.FC<
  DeviceIdentificationEditorProps
> = ({ udr }) => {
  const dispatch = useAppDispatch();

  const fieldFactory = new StructuredItemFieldFactory(
    "deviceIdentification",
    udr,
    dispatch
  );

  return (
    <div className="structured-item-editor device-identification-editor">
      <h3 className="structured-item-editor-title">Device Identification</h3>
      <SimplePropsTable name="Manufacturer Information">
        {fieldFactory.getTextEditorRow(
          "Manufacturer Name",
          udr.manufacturer.name,
          (draft, newValue) => {
            draft.manufacturer.name = newValue;
          }
        )}
        {fieldFactory.getTextEditorRow(
          "Manufacturer URL",
          udr.manufacturer.url,
          (draft, newValue) => {
            draft.manufacturer.url = newValue;
          }
        )}
        {fieldFactory.getTextEditorRow(
          "Manufacturer ESTA ID",
          udr.manufacturer.estaId,
          (draft, newValue) => {
            draft.manufacturer.estaId = newValue;
          }
        )}
      </SimplePropsTable>
      <SimplePropsTable name="Model Information">
        {fieldFactory.getTextEditorRow(
          "Model Name",
          udr.model.name,
          (draft, newValue) => {
            draft.model.name = newValue;
          }
        )}
        {fieldFactory.getTextEditorRow(
          "Product Identifier",
          udr.model.productIdentifier,
          (draft, newValue) => {
            draft.model.productIdentifier = newValue;
          }
        )}
        {fieldFactory.getSelectRow(
          "Category",
          Object.values(DeviceCategory),
          udr.model.category,
          (draft, newValue) => {
            draft.model.category = newValue as DeviceCategory;
            draft.model.subcategory =
              deviceSubCategoryMap[newValue as DeviceCategory][0];
          }
        )}
        {fieldFactory.getSelectRow(
          "Subcategory",
          deviceSubCategoryMap[udr.model.category],
          udr.model.subcategory,
          (draft, newValue) => {
            draft.model.subcategory = newValue as DeviceSubCategory;
          }
        )}
      </SimplePropsTable>
    </div>
  );
};

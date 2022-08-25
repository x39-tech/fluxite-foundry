import { useState } from "react";
// import { Select2 } from "@blueprintjs/select"; TODO figure out how to use in place of HTMLSelect for nicer styling
import { Button, Collapse } from "@blueprintjs/core";
import { StructuredItemFieldFactory } from "features/fixtureEditor/structuredItemsEditor/structuredItemFieldFactory";
import { DeviceIdentification } from "udr/libraries/core/structuredItems/deviceIdentification";
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
  const fieldFactory = new StructuredItemFieldFactory(
    "deviceIdentification",
    udr,
    useAppDispatch()
  );

  const [isExpanded, setExpanded] = useState(true);

  return (
    <div className="structured-item-editor device-identification-editor">
      <div className="structured-item-editor-title-section">
        <Button
          icon={isExpanded ? "minus" : "plus"}
          minimal={true}
          style={{ opacity: 0.8 }}
          onClick={() => setExpanded(!isExpanded)}
        />
        <h3 className="structured-item-editor-title">Device Identification</h3>
      </div>
      <Collapse isOpen={isExpanded}>
        <div className="structured-item-collapse-body">
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
          <SimplePropsTable name="Compatibility">
            {fieldFactory.getTagListRow(
              "Firmware Versions",
              udr.compatibility?.firmwareVersions || [],
              (draft, newValue) => {
                draft.compatibility = {
                  firmwareVersions: newValue,
                };
              }
            )}
          </SimplePropsTable>
        </div>
      </Collapse>
    </div>
  );
};

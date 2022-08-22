import { EditableText, HTMLSelect } from "@blueprintjs/core";
// import { Select2 } from "@blueprintjs/select"; TODO figure out how to use in place of HTMLSelect for nicer styling
import { DeviceIdentification } from "udr/objects/structured_items/device_identification";
import { DeviceCategory, deviceSubCategoryMap } from "udr/util/enums";
import "./DeviceIdentificationEditor.scss";
import { SimplePropsTable } from "./SimplePropsTable";
import "./StructuredItemEditor.css";

export interface DeviceIdentificationEditorProps {
  udr: DeviceIdentification;
  onValueChanged: (newValue: object) => void;
}

export const DeviceIdentificationEditor: React.FC<
  DeviceIdentificationEditorProps
> = ({ udr, onValueChanged }) => {
  return (
    <div className="structured-item-editor device-identification-editor">
      <h3 className="structured-item-editor-title">Device Identification</h3>
      <SimplePropsTable name="Manufacturer Information">
        <tr>
          <td>Manufacturer Name</td>
          <td>
            <EditableText
              value={udr.manufacturer.name}
              onConfirm={(value) => {
                onValueChanged({ manufacturer: { name: value } });
              }}
            />
          </td>
        </tr>
        <tr>
          <td>Manufacturer URL</td>
          <td>
            <EditableText value={udr.manufacturer.url} />
          </td>
        </tr>
        <tr>
          <td>Manufacturer ESTA ID</td>
          <td>
            <EditableText value={udr.manufacturer.estaId} />
          </td>
        </tr>
      </SimplePropsTable>
      <SimplePropsTable name="Model Information">
        <tr>
          <td>Name</td>
          <td>
            <EditableText value={udr.model.name} />
          </td>
        </tr>
        <tr>
          <td>Product Identifier</td>
          <td>
            <EditableText value={udr.model.productIdentifier} />
          </td>
        </tr>
        <tr>
          <td>Category</td>
          <td>
            <HTMLSelect
              options={Object.values(DeviceCategory)}
              onChange={(event) => {
                onValueChanged({
                  model: { category: event.currentTarget.value },
                });
              }}
            />
          </td>
        </tr>
        <tr>
          <td>Subcategory</td>
          <td>
            <HTMLSelect options={deviceSubCategoryMap[udr.model.category]} />
          </td>
        </tr>
      </SimplePropsTable>
    </div>
  );
};

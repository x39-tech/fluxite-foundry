import { Divider } from "@blueprintjs/core";
import React from "react";
import { StructuredItem } from "udr/objects/item";
import { DeviceIdentification } from "udr/objects/structured_items/device_identification";
import { DeviceIdentificationEditor } from "./StructuredItems/DeviceIdentificationEditor";
import "./StructuredItemsEditor.css";

type OnStructuredItemValueChangedFn = (
  structuredItemName: string,
  newValue: object
) => void;

const editorFactory = {
  deviceIdentification: (
    udr: DeviceIdentification,
    key: number,
    onValueChanged: OnStructuredItemValueChangedFn
  ) => {
    return (
      <DeviceIdentificationEditor
        key={key}
        udr={udr}
        onValueChanged={(newValue) => {
          onValueChanged("deviceIdentification", newValue);
        }}
      />
    );
  },
};

export interface StructuredItemsEditorProps {
  udr?: Record<string, StructuredItem>;
  structuredItems: Array<string>;
  onValueChanged: OnStructuredItemValueChangedFn;
}

export const StructuredItemsEditor: React.FC<StructuredItemsEditorProps> = ({
  udr,
  structuredItems,
  onValueChanged,
}) => {
  const editors: Array<JSX.Element> = [];
  for (const [index, structuredItemName] of structuredItems.entries()) {
    if (
      structuredItemName in editorFactory &&
      udr &&
      structuredItemName in udr
    ) {
      editors.push(
        editorFactory[structuredItemName as keyof typeof editorFactory](
          udr[structuredItemName].default!,
          index,
          onValueChanged
        )
      );
    }
  }
  return (
    <div className="structured-items-editor">
      <h2 className="structured-items-editor-title">Structured Items</h2>
      <Divider />
      <div className="structured-items-editor-container">{editors}</div>
    </div>
  );
};

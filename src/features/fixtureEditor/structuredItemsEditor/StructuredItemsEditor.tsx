import { Divider } from "@blueprintjs/core";
import React from "react";
import { StructuredItem, StructuredItemValue } from "udr/objects/item";
import { DeviceIdentification } from "udr/objects/structuredItems/device_identification";
import { DeviceIdentificationEditor } from "./structuredItems/DeviceIdentificationEditor";
import "./StructuredItemsEditor.css";

const editorFactory = {
  deviceIdentification: (udr: DeviceIdentification, key: number) => {
    return <DeviceIdentificationEditor key={key} udr={udr} />;
  },
};

export interface StructuredItemsEditorProps {
  udr?: Record<string, StructuredItem>;
  structuredItemEditors: Array<string>;
}

export const StructuredItemsEditor: React.FC<StructuredItemsEditorProps> = ({
  udr,
  structuredItemEditors,
}) => {
  const editors: Array<JSX.Element> = [];
  for (const [index, structuredItemName] of structuredItemEditors.entries()) {
    if (
      structuredItemName in editorFactory &&
      udr &&
      structuredItemName in udr
    ) {
      editors.push(
        editorFactory[structuredItemName as keyof typeof editorFactory](
          udr[structuredItemName].default!,
          index
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

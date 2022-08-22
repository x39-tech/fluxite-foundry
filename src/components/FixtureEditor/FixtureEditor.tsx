import React from "react";
import { BPSplit } from "components/BPSplit/BPSplit";
import { ScalarItemsEditor } from "./ScalarItemsEditor";
import { StructuredItemsEditor } from "./StructuredItemsEditor";
import { DeviceClass } from "udr/objects/device_class";
import "./FixtureEditor.scss";

export interface FixtureEditorProps {
  name: string;
  id: string;
  udr: DeviceClass;
  structuredItems: Array<string>;
  onStructuredItemChanged: (
    structuredItemName: string,
    newValue: object
  ) => void;
}

export const FixtureEditor: React.FC<FixtureEditorProps> = ({
  name,
  id,
  udr,
  structuredItems,
  onStructuredItemChanged,
}) => {
  return (
    <BPSplit className="fixture-editor" sizes={[50, 50]}>
      <ScalarItemsEditor name={name} />
      <StructuredItemsEditor
        udr={udr.structuredItems}
        structuredItems={structuredItems}
        onValueChanged={onStructuredItemChanged}
      />
    </BPSplit>
  );
};

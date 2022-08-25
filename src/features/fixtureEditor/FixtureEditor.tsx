import React from "react";
import { BPSplit } from "utils/components/BPSplit/BPSplit";
import { ScalarItemsEditor } from "./scalarItemsEditor/ScalarItemsEditor";
import { StructuredItemsEditor } from "./structuredItemsEditor/StructuredItemsEditor";
import { DeviceClass } from "udr/objects/deviceClass";
import "./FixtureEditor.scss";

export interface FixtureEditorProps {
  name: string;
  udr: DeviceClass;
  structuredItemEditors: Array<string>;
}

export const FixtureEditor: React.FC<FixtureEditorProps> = ({
  name,
  udr,
  structuredItemEditors,
}) => {
  return (
    <BPSplit className="fixture-editor" sizes={[50, 50]}>
      <ScalarItemsEditor name={name} />
      <StructuredItemsEditor
        udr={udr.structuredItems}
        structuredItemEditors={structuredItemEditors}
      />
    </BPSplit>
  );
};

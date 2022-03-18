import React from "react";
import { BPSplit } from "components/BPSplit/BPSplit";
import { FixtureEditorSidebar } from "./FixtureEditorSidebar";
import { FixturePropertiesEditor } from "./FixturePropertiesEditor";
import "./FixtureEditor.scss";

export interface FixtureEditorProps {
  name: string;
  id: string;
}

export const FixtureEditor: React.FC<FixtureEditorProps> = (props) => {
  return (
    <BPSplit className="fixture-editor" sizes={[25, 75]}>
      <FixtureEditorSidebar name={props.name} />
      <FixturePropertiesEditor />
    </BPSplit>
  );
};

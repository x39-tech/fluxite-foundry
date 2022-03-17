import React from "react";
import { BPSplit } from "../BPSplit/BPSplit";
import { FixtureEditorSidebar } from "./FixtureEditorSidebar";
import { FixturePropertiesEditor } from "./FixturePropertiesEditor";
import "./FixtureEditor.css";

export interface FixtureEditorProps {
  name: string;
  id: string;
}

// TODO reevaluate split gutter styling / use of blueprint divider

export const FixtureEditor: React.FC<FixtureEditorProps> = (props) => {
  return (
    <BPSplit className="fixture-editor">
      <FixtureEditorSidebar name={props.name} />
      <FixturePropertiesEditor />
    </BPSplit>
  );
};

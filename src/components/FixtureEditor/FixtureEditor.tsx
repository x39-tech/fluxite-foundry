import React, { ReactDOM } from "react";
import { Divider } from "@blueprintjs/core";
import Split from "react-split";
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
    <Split
      className="fixture-editor"
      gutter={() => {
        const gutter = document.createElement("div");
        gutter.className = "gutter bp3-divider";
        return gutter;
      }}
      gutterStyle={() => {
        return {};
      }}
    >
      <FixtureEditorSidebar name={props.name} />
      <FixturePropertiesEditor />
    </Split>
  );
};

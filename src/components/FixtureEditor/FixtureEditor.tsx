import React from "react";
import { Divider } from "@blueprintjs/core";
import { FixtureEditorSidebar } from "./FixtureEditorSidebar";
import { FixtureDisplayArea } from "./FixtureDisplayArea";
import "./FixtureEditor.css";

export interface FixtureEditorProps {
  name: string;
  id: string;
}

export const FixtureEditor: React.FC<FixtureEditorProps> = (props) => {
  return (
    <div className="FixtureEditor">
      <FixtureEditorSidebar name={props.name} />
      <Divider />
      <FixtureDisplayArea />
    </div>
  );
};

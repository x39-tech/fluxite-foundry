import React from "react";
import { HTMLTable } from "@blueprintjs/core";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import "./FixtureEditorSidebar.css";

export interface FixtureEditorSidebarProps {
  name: string;
}

export const FixtureEditorSidebar : React.FC<FixtureEditorSidebarProps> = ({name}) => {
  return (
    <ResizableBox width={200} height={200} axis="x">
      <HTMLTable>
        <thead>
          <tr>
            <td>Foo</td>
            <td>Bar</td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Name</td>
            <td>{name}</td>
          </tr>
        </tbody>
      </HTMLTable>
    </ResizableBox>
  );
};

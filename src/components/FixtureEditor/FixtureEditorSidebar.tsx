import React from "react";
import { HTMLTable } from "@blueprintjs/core";
import "./FixtureEditorSidebar.css";

export interface FixtureEditorSidebarProps {
  name: string;
}

export const FixtureEditorSidebar: React.FC<FixtureEditorSidebarProps> = ({
  name,
}) => {
  return (
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
  );
};

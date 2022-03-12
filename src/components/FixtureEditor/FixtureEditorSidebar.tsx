import React from "react";
import { HTMLTable } from "@blueprintjs/core";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import "./FixtureEditorSidebar.css";

export const FixtureEditorSidebar = () => {
  return (
    <ResizableBox width={200} height={200} axis="x">
      <HTMLTable>
        <thead>
          <td>Foo</td>
          <td>Bar</td>
        </thead>
      </HTMLTable>
    </ResizableBox>
  );
};

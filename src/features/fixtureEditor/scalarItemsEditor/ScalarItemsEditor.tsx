import React from "react";
import { Divider, HTMLTable } from "@blueprintjs/core";
import "./ScalarItemsEditor.css";

export interface ScalarItemsEditorProps {
  name: string;
}

export const ScalarItemsEditor: React.FC<ScalarItemsEditorProps> = ({
  name,
}) => {
  return (
    <div className="scalar-items-editor">
      <h2 className="scalar-items-editor-title">Scalar Items</h2>
      <Divider />
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
    </div>
  );
};

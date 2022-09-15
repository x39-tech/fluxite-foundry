import { Divider } from "@blueprintjs/core";
import { useAppSelector } from "app/hooks";
import { useState } from "react";
import { AddItemSection } from "utils/components/AddItemSection/AddItemSection";
import { NewScalarItemDialog } from "./NewScalarItemDialog";
import { ScalarItemEditor } from "./ScalarItemEditor";
import "./ScalarItemsEditor.scss";

export const ScalarItemsEditor = () => {
  const editorState = useAppSelector(
    (state) =>
      state.fixtureEditor.openEditors[state.fixtureEditor.selectedEditor]
  );

  const [newScalarItemDialogIsOpen, setNewScalarItemDialogIsOpen] =
    useState(false);

  const scalarItemEditors: Array<JSX.Element> = [];
  if (editorState.udr.scalarItems) {
    editorState.scalarItemEditors.forEach((editor) => {
      if (editor.udrId in editorState.udr.scalarItems!) {
        scalarItemEditors.push(
          <ScalarItemEditor
            key={editor.id}
            id={editor.udrId}
            udr={editorState.udr.scalarItems![editor.udrId]}
          />
        );
      }
    });
  }

  return (
    <div className="scalar-items-editor-content">
      {scalarItemEditors}
      <AddItemSection onClick={() => setNewScalarItemDialogIsOpen(true)} />
      <NewScalarItemDialog
        isOpen={newScalarItemDialogIsOpen}
        onClose={() => {
          setNewScalarItemDialogIsOpen(false);
        }}
      />
    </div>
  );
};

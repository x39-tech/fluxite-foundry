import { useState } from "react";
import { AddItemSection } from "utils/components/AddItemSection/AddItemSection";
import { NewScalarItemDialog } from "./NewScalarItemDialog";
import { ScalarItemEditor } from "./ScalarItemEditor";
import "./ScalarItemsEditor.scss";
import { useCurrentEditorSelector } from "../deviceClassEditorsState";

export const ScalarItemsEditor = () => {
  const editorState = useCurrentEditorSelector((state) => state.scalarItems);

  const [newScalarItemDialogIsOpen, setNewScalarItemDialogIsOpen] =
    useState(false);

  const scalarItemEditors: Array<JSX.Element> = [];
  editorState.itemEditorLayout.forEach((editor) => {
    if (editor.udrId in editorState.scalarItems) {
      scalarItemEditors.push(
        <ScalarItemEditor
          key={editor.id}
          id={editor.udrId}
          udr={editorState.scalarItems[editor.udrId]}
        />
      );
    }
  });

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

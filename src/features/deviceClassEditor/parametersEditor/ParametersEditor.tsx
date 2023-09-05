import { useState } from "react";
import { useCurrentEditorSelector } from "app/hooks";
import { AddItemSection } from "utils/components/AddItemSection/AddItemSection";
import { NewParameterDialog } from "./NewParameterDialog";
import { ParameterEditor } from "./ParameterEditor";
import "./ParametersEditor.scss";

export const ParametersEditor = () => {
  const editorState = useCurrentEditorSelector((state) => state.parameters);

  const [newParameterDialogIsOpen, setNewParameterDialogIsOpen] =
    useState(false);

  const parameterEditors: Array<JSX.Element> = [];
  editorState.itemEditorLayout.forEach((editor) => {
    if (editor.udrId in editorState.parameters) {
      parameterEditors.push(
        <ParameterEditor
          key={editor.id}
          id={editor.udrId}
          udr={editorState.parameters[editor.udrId]}
        />,
      );
    }
  });

  return (
    <div className="parameters-editor-content">
      {parameterEditors}
      <AddItemSection onClick={() => setNewParameterDialogIsOpen(true)} />
      <NewParameterDialog
        isOpen={newParameterDialogIsOpen}
        onClose={() => {
          setNewParameterDialogIsOpen(false);
        }}
      />
    </div>
  );
};

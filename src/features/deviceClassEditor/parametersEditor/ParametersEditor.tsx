import { useState } from "react";
import { useCurrentEditorSelector } from "app/hooks";
import { AddItemSection } from "utils/components/AddItemSection/AddItemSection";
import { NewParameterDialog } from "./NewParameterDialog";
import { ParameterEditor } from "./ParameterEditor";
import { UdrDatabase } from "udr/udrDatabase";
import "./ParametersEditor.scss";

interface Props {
  database: UdrDatabase;
}

export const ParametersEditor = ({ database }: Props) => {
  const editorState = useCurrentEditorSelector((state) => state.parameters);

  const [newParameterDialogIsOpen, setNewParameterDialogIsOpen] =
    useState(false);

  const parameterEditors = editorState.itemEditorLayout
    .filter((editor) => editor.udrId in editorState.parameters)
    .map((editor) => (
      <ParameterEditor
        key={editor.id}
        id={editor.udrId}
        udr={editorState.parameters[editor.udrId]}
        database={database}
      />
    ));

  return (
    <div className="parameters-editor-content">
      {parameterEditors}
      <AddItemSection onClick={() => setNewParameterDialogIsOpen(true)} />
      <NewParameterDialog
        isOpen={newParameterDialogIsOpen}
        onClose={() => {
          setNewParameterDialogIsOpen(false);
        }}
        database={database}
      />
    </div>
  );
};

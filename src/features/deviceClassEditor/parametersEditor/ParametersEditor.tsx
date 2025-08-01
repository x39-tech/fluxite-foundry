import { useState } from "react";
import { AddItemSection } from "components/AddItemSection";
import { NewParameterDialog } from "./NewParameterDialog";
import { ParameterEditor } from "./ParameterEditor";
import { useParameterEditors } from "./state";
import "./ParametersEditor.scss";

export const ParametersEditor = () => {
  const editorStates = useParameterEditors();

  const [newParameterDialogIsOpen, setNewParameterDialogIsOpen] =
    useState(false);

  const parameterEditors = editorStates.map((editor) => (
    <ParameterEditor key={editor.id} id={editor.udrId} />
  ));

  return (
    <div className="flex flex-col items-stretch p-1">
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

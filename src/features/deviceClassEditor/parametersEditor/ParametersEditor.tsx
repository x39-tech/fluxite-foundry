import { useState } from "react";
import { NewParameterDialog } from "./NewParameterDialog";
import { deleteParameter, useParameterEditors } from "./state";
import { ParameterEditor } from "./ParameterEditor";
import { ListItemsEditor } from "components/ListItemsEditor";

export const ParametersEditor = () => {
  const editorStates = useParameterEditors();
  const [newParameterDialogIsOpen, setNewParameterDialogIsOpen] =
    useState(false);

  return (
    <>
      <ListItemsEditor
        editors={editorStates}
        itemType="Parameter"
        getEditorTitle={(editor) => editor.codexId}
        onAddItem={() => setNewParameterDialogIsOpen(true)}
        onDeleteItem={(editor) => deleteParameter(editor.id)}
        renderActiveEditor={(editor) => <ParameterEditor id={editor.id} />}
      />
      <NewParameterDialog
        isOpen={newParameterDialogIsOpen}
        onClose={() => setNewParameterDialogIsOpen(false)}
      />
    </>
  );
};

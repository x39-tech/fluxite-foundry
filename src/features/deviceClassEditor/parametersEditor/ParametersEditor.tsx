import { useState } from "react";
import { msg } from "@lingui/core/macro";
import { NewParameterDialog } from "./NewParameterDialog";
import { deleteParameter, useParameterEditors } from "./state";
import { ParameterEditor } from "./ParameterEditor";
import {
  ListItemsEditor,
  ListItemsEditorLabels,
} from "components/ListItemsEditor";

const LABELS: ListItemsEditorLabels = {
  add: msg({
    id: "deviceClassEditor.parameters.list.add",
    message: "Add Parameter",
  }),
  delete: msg({
    id: "deviceClassEditor.parameters.list.delete",
    message: "Delete Parameter",
  }),
  search: msg({
    id: "deviceClassEditor.parameters.list.search",
    message: "Search Parameters",
  }),
  emptyState: msg({
    id: "deviceClassEditor.parameters.list.emptyState",
    message: "Add a parameter to start editing",
  }),
  selectPrompt: msg({
    id: "deviceClassEditor.parameters.list.selectPrompt",
    message: "Select a parameter to start editing",
  }),
};

export const ParametersEditor = () => {
  const editorStates = useParameterEditors();
  const [newParameterDialogIsOpen, setNewParameterDialogIsOpen] =
    useState(false);

  return (
    <>
      <ListItemsEditor
        editors={editorStates}
        labels={LABELS}
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

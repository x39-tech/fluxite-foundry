import { useState } from "react";
import { msg } from "@lingui/core/macro";
import { NewCommandDialog } from "./NewCommandDialog";
import { deleteCommand, useCommandEditors } from "./state";
import { CommandEditor } from "./CommandEditor";
import {
  ListItemsEditor,
  ListItemsEditorLabels,
} from "components/ListItemsEditor";

const LABELS: ListItemsEditorLabels = {
  add: msg({
    id: "deviceClassEditor.commands.list.add",
    message: "Add Command",
  }),
  delete: msg({
    id: "deviceClassEditor.commands.list.delete",
    message: "Delete Command",
  }),
  search: msg({
    id: "deviceClassEditor.commands.list.search",
    message: "Search Commands",
  }),
  emptyState: msg({
    id: "deviceClassEditor.commands.list.emptyState",
    message: "Add a command to start editing",
  }),
  selectPrompt: msg({
    id: "deviceClassEditor.commands.list.selectPrompt",
    message: "Select a command to start editing",
  }),
};

export const CommandsEditor = () => {
  const editorStates = useCommandEditors();
  const [newResourceDialogIsOpen, setNewResourceDialogIsOpen] = useState(false);

  return (
    <>
      <ListItemsEditor
        editors={editorStates}
        labels={LABELS}
        getEditorTitle={(editor) => editor.codexId}
        onAddItem={() => setNewResourceDialogIsOpen(true)}
        onDeleteItem={(editor) => deleteCommand(editor.id)}
        renderActiveEditor={(editor) => <CommandEditor id={editor.id} />}
      />
      <NewCommandDialog
        isOpen={newResourceDialogIsOpen}
        onClose={() => setNewResourceDialogIsOpen(false)}
      />
    </>
  );
};

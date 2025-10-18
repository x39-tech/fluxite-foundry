import { useState } from "react";
import { NewCommandDialog } from "./NewCommandDialog";
import { deleteCommand, useCommandEditors } from "./state";
import { CommandEditor } from "./CommandEditor";
import { ListItemsEditor } from "components/ListItemsEditor";

export const CommandsEditor = () => {
  const editorStates = useCommandEditors();
  const [newResourceDialogIsOpen, setNewResourceDialogIsOpen] = useState(false);

  return (
    <>
      <ListItemsEditor
        editors={editorStates}
        itemType="Command"
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

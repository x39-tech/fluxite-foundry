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
        getEditorTitle={(editor) => editor.udrId}
        onAddItem={() => setNewResourceDialogIsOpen(true)}
        onDeleteItem={(editor) => deleteCommand(editor.udrId)}
        renderActiveEditor={(editor) => <CommandEditor id={editor.udrId} />}
      />
      <NewCommandDialog
        isOpen={newResourceDialogIsOpen}
        onClose={() => setNewResourceDialogIsOpen(false)}
      />
    </>
  );
};

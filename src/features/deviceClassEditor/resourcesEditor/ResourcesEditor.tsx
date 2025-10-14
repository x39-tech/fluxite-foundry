import { useState } from "react";
import { NewResourceDialog } from "./NewResourceDialog";
import { deleteResource, useResourceEditors } from "./state";
import { ResourceEditor } from "./ResourceEditor";
import { ListItemsEditor } from "components/ListItemsEditor";

export const ResourcesEditor = () => {
  const editorStates = useResourceEditors();
  const [newResourceDialogIsOpen, setNewResourceDialogIsOpen] = useState(false);

  return (
    <>
      <ListItemsEditor
        editors={editorStates}
        itemType="Resource"
        getEditorTitle={(editor) => editor.udrId}
        onAddItem={() => setNewResourceDialogIsOpen(true)}
        onDeleteItem={(editor) => deleteResource(editor.udrId)}
        renderActiveEditor={(editor) => <ResourceEditor id={editor.udrId} />}
      />
      <NewResourceDialog
        isOpen={newResourceDialogIsOpen}
        onClose={() => setNewResourceDialogIsOpen(false)}
      />
    </>
  );
};

import { useState } from "react";
import { NewResourceDialog } from "./NewResourceDialog";
import { deleteResource, useResourceEditors } from "./state";
import { ResourceEditor } from "./ResourceEditor";
import { msg } from "@lingui/core/macro";
import {
  ListItemsEditor,
  ListItemsEditorLabels,
} from "components/ListItemsEditor";

const LABELS: ListItemsEditorLabels = {
  add: msg({
    id: "deviceClassEditor.resources.list.add",
    message: "Add Resource",
  }),
  delete: msg({
    id: "deviceClassEditor.resources.list.delete",
    message: "Delete Resource",
  }),
  search: msg({
    id: "deviceClassEditor.resources.list.search",
    message: "Search Resources",
  }),
  emptyState: msg({
    id: "deviceClassEditor.resources.list.emptyState",
    message: "Add a resource to start editing",
  }),
  selectPrompt: msg({
    id: "deviceClassEditor.resources.list.selectPrompt",
    message: "Select a resource to start editing",
  }),
};

export const ResourcesEditor = () => {
  const editorStates = useResourceEditors();
  const [newResourceDialogIsOpen, setNewResourceDialogIsOpen] = useState(false);

  return (
    <>
      <ListItemsEditor
        editors={editorStates}
        labels={LABELS}
        getEditorTitle={(editor) => editor.codexId}
        onAddItem={() => setNewResourceDialogIsOpen(true)}
        onDeleteItem={(editor) => deleteResource(editor.id)}
        renderActiveEditor={(editor) => <ResourceEditor id={editor.id} />}
      />
      <NewResourceDialog
        isOpen={newResourceDialogIsOpen}
        onClose={() => setNewResourceDialogIsOpen(false)}
      />
    </>
  );
};

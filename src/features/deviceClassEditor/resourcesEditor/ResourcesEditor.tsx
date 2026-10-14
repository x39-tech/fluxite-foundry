import { useState } from "react";
import { toast } from "sonner";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { NewResourceDialog } from "./NewResourceDialog";
import { deleteResource, useResourceEditors } from "./state";
import { ResourceEditor } from "./ResourceEditor";
import {
  ListItemsEditor,
  ListItemsEditorLabels,
} from "components/ListItemsEditor";
import { useSpdBackedResourceIds } from "../emittersEditor/state";

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

const SPD_BACKED_UNDELETABLE = msg({
  id: "deviceClassEditor.resources.spdBackedUndeletable",
  message:
    "{codexId} holds an emitter's spectral power distribution. Remove it from the emitter in the Emitters editor instead.",
});

export const ResourcesEditor = () => {
  const editorStates = useResourceEditors();
  const spdBacked = useSpdBackedResourceIds();
  const [newResourceDialogIsOpen, setNewResourceDialogIsOpen] = useState(false);

  return (
    <>
      <ListItemsEditor
        editors={editorStates}
        labels={LABELS}
        getEditorTitle={(editor) => editor.codexId}
        onAddItem={() => setNewResourceDialogIsOpen(true)}
        onDeleteItem={(editor) => {
          if (spdBacked.has(editor.id)) {
            toast(
              i18n._({
                ...SPD_BACKED_UNDELETABLE,
                values: { codexId: editor.codexId },
              }),
            );
            return false;
          }
          deleteResource(editor.id);
        }}
        renderActiveEditor={(editor) => <ResourceEditor id={editor.id} />}
      />
      <NewResourceDialog
        isOpen={newResourceDialogIsOpen}
        onClose={() => setNewResourceDialogIsOpen(false)}
      />
    </>
  );
};

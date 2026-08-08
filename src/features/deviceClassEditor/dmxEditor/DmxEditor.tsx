import { msg } from "@lingui/core/macro";
import {
  ListItemsEditor,
  ListItemsEditorLabels,
} from "components/ListItemsEditor";
import { addDmxChunk, removeDmxChunk, useDmxChunkEditors } from "./state";
import { DmxChunkEditor } from "./DmxChunkEditor";

const LABELS: ListItemsEditorLabels = {
  add: msg({
    id: "deviceClassEditor.dmxEditor.list.add",
    message: "Add DMX Slot Group",
  }),
  delete: msg({
    id: "deviceClassEditor.dmxEditor.list.delete",
    message: "Delete DMX Slot Group",
  }),
  search: msg({
    id: "deviceClassEditor.dmxEditor.list.search",
    message: "Search DMX Slot Groups",
  }),
  emptyState: msg({
    id: "deviceClassEditor.dmxEditor.list.emptyState",
    message: "Add a DMX slot group to start editing",
  }),
  selectPrompt: msg({
    id: "deviceClassEditor.dmxEditor.list.selectPrompt",
    message: "Select a DMX slot group to start editing",
  }),
};

export const DmxEditor = () => {
  const editors = useDmxChunkEditors();

  return (
    <ListItemsEditor
      editors={editors}
      labels={LABELS}
      showItemIcon={false}
      onAddItem={addDmxChunk}
      onDeleteItem={(editor) => removeDmxChunk(editor.id)}
      renderActiveEditor={(editor) => <DmxChunkEditor chunkId={editor.id} />}
    />
  );
};

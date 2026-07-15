import { ListItemsEditor } from "components/ListItemsEditor";
import { addDmxChunk, removeDmxChunk, useDmxChunkEditors } from "./state";
import { DmxChunkEditor } from "./DmxChunkEditor";

export const DmxEditor = () => {
  const editors = useDmxChunkEditors();

  return (
    <ListItemsEditor
      editors={editors}
      itemType="DMX Slot Group"
      variant="accordion"
      searchPlaceholder="Search DMX Slot Groups..."
      onAddItem={addDmxChunk}
      onDeleteItem={(editor) => removeDmxChunk(editor.id)}
      renderActiveEditor={(editor) => <DmxChunkEditor chunkId={editor.id} />}
    />
  );
};

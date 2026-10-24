import { msg } from "@lingui/core/macro";
import { EntityId } from "app/persistentState";
import { Trans } from "@lingui/react/macro";
import {
  ListItemsEditor,
  ListItemsEditorLabels,
} from "components/ListItemsEditor";
import {
  addDmxChunk,
  removeDmxChunk,
  EditedDmxSerializerContext,
  useDmxChunkEditors,
  useTabDmxSerializerId,
} from "./state";
import { DmxChunkEditor } from "./DmxChunkEditor";
import { DmxModeBar } from "./DmxModeBar";

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

interface Props {
  tabId: string;
}

export const DmxEditor = ({ tabId }: Props) => {
  const serializerId = useTabDmxSerializerId(tabId);

  return (
    <div className="flex h-full flex-col">
      <DmxModeBar tabId={tabId} serializerId={serializerId} />
      <div className="min-h-0 flex-1">
        {serializerId ? (
          <EditedDmxSerializerContext.Provider value={serializerId}>
            {/* Keyed so that switching modes clears state data like search
                text and slot selection */}
            <SlotGroupsEditor key={serializerId} serializerId={serializerId} />
          </EditedDmxSerializerContext.Provider>
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-muted-foreground">
            <Trans id="deviceClassEditor.dmxEditor.noModes">
              Add a mode to start editing DMX mappings
            </Trans>
          </div>
        )}
      </div>
    </div>
  );
};

const SlotGroupsEditor = ({ serializerId }: { serializerId: EntityId }) => {
  const editors = useDmxChunkEditors();

  return (
    <ListItemsEditor
      editors={editors}
      labels={LABELS}
      showItemIcon={false}
      onAddItem={() => addDmxChunk(serializerId)}
      onDeleteItem={(editor) => removeDmxChunk(serializerId, editor.id)}
      renderActiveEditor={(editor) => <DmxChunkEditor chunkId={editor.id} />}
    />
  );
};

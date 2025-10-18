import { EntityId } from "app/persistentState";
import { ItemEditor } from "components/ItemEditor/ItemEditor";
import {
  addDmxChunk,
  addParameterMappingGroup,
  changeDmxChunkOffsets,
  getMappingGroupsForChunk,
  removeDmxChunk,
  useDmxSerializer,
} from "./state";
import { AddItemSection } from "components/AddItemSection";
import { TagInputField } from "components/EditorFields/TagInputField";
import { DmxParameterGroup } from "./DmxParameterGroup";

export const DmxEditor = () => {
  const dmx = useDmxSerializer();

  const chunksArray = Object.entries(dmx?.chunks || {}) as [
    EntityId,
    { offsets: number[] },
  ][];

  return (
    <div className="flex flex-col items-stretch p-1">
      {chunksArray.map(([chunkId, chunk]) => {
        const mappingGroups = dmx ? getMappingGroupsForChunk(dmx, chunkId) : [];

        return (
          <ItemEditor
            key={chunkId}
            title={`Slot ${chunk.offsets.join(", ")}`}
            onDelete={() => removeDmxChunk(chunkId)}
          >
            <div className="flex items-center">
              Offsets used:
              <TagInputField
                className="ml-1"
                values={chunk.offsets.map((o) => o.toString())}
                onValuesChanged={(newValues) => {
                  changeDmxChunkOffsets(chunkId, newValues);
                }}
              />
            </div>
            {mappingGroups.map((mappingGroup) => (
              <DmxParameterGroup
                key={mappingGroup.id}
                chunkId={chunkId}
                mappingGroupId={mappingGroup.id}
                mappingGroup={mappingGroup}
              />
            ))}
            <AddItemSection
              text="Add Parameter Group"
              onClick={() => addParameterMappingGroup(chunkId)}
            />
          </ItemEditor>
        );
      })}
      <AddItemSection text="Add DMX Slot Group" onClick={addDmxChunk} />
    </div>
  );
};

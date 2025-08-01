import { ItemEditor } from "components/ItemEditor/ItemEditor";
import {
  addDmxChunk,
  addParameterMappingGroup,
  changeDmxChunkOffsets,
  removeDmxChunk,
  useDmxSerializer,
} from "./state";
import { AddItemSection } from "components/AddItemSection";
import { TagInputField } from "components/EditorFields/TagInputField";
import { DmxParameterGroup } from "./DmxParameterGroup";

export const DmxEditor = () => {
  const dmx = useDmxSerializer();

  const chunksArray = Object.entries(dmx?.udr.chunks || {});

  return (
    <div className="flex flex-col items-stretch p-1">
      {chunksArray.map(([chunkId, chunk]) => {
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
            {chunk.mappingGroups.map((mappingGroup, index) => (
              <DmxParameterGroup
                key={index}
                index={index}
                mappingGroup={mappingGroup}
                chunkId={chunkId}
                chunks={dmx!.udr.chunks}
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

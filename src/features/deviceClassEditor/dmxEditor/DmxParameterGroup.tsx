import { Tooltip } from "@blueprintjs/core";
import { Chunk, MappingGroup } from "e173";
import { Button } from "utils/components/Button";
import {
  addCondition,
  addParameterMapping,
  removeCondition,
  removeParameterMapping,
  removeParameterMappingGroup,
  updateCondition,
  updateParameterMapping,
} from "./state";
import { DmxParameterMapping } from "./DmxParameterMapping";
import { DmxCondition } from "./DmxCondition";

interface DmxParameterGroupProps {
  chunks: Record<string, Chunk>;
  chunkId: string;
  index: number;
  mappingGroup: MappingGroup;
}

export const DmxParameterGroup = ({
  chunks,
  chunkId,
  index: groupIndex,
  mappingGroup,
}: DmxParameterGroupProps) => {
  const chunksArray = Object.entries(chunks);

  return (
    <div className="bg-gray-300 dark:bg-gray-700 my-2 p-1 rounded-lg">
      <div className="flex">
        <div className="font-bold mx-2 my-1">Parameter Group</div>
        <div className="grow" />
        <Button
          icon="TrashIcon"
          minimal
          onClick={() => removeParameterMappingGroup(chunkId, groupIndex)}
        />
      </div>
      {mappingGroup.mappings.map((mapping, index) => (
        <DmxParameterMapping
          key={index}
          mapping={mapping}
          onUpdate={(newMapping) => {
            updateParameterMapping(chunkId, groupIndex, index, newMapping);
          }}
          onRemove={() => removeParameterMapping(chunkId, groupIndex, index)}
        />
      ))}
      <div className="font-bold m-2">Conditions</div>
      {(mappingGroup.conditions || []).map((condition, index) => (
        <DmxCondition
          key={index}
          condition={condition}
          chunks={chunks}
          parentChunkId={chunkId}
          onUpdate={(newCondition) => {
            updateCondition(chunkId, groupIndex, index, newCondition);
          }}
          onRemove={() => removeCondition(chunkId, groupIndex, index)}
        />
      ))}
      <div className="flex items-center my-1">
        <div className="grow" />
        <Tooltip content="Add Parameter Mapping">
          <Button
            icon="CalculatorIcon"
            minimal
            onClick={() => addParameterMapping(chunkId, groupIndex)}
          />
        </Tooltip>
        <Tooltip content="Add Condition">
          <Button
            icon="FunnelIcon"
            minimal
            disabled={chunksArray.length <= 1}
            onClick={() => addCondition(chunkId, groupIndex)}
          />
        </Tooltip>
      </div>
    </div>
  );
};

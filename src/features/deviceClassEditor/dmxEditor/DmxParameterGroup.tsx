import {
  CalculatorIcon,
  FunnelIcon,
  TrashIcon,
} from "@heroicons/react/24/solid";
import { DmxMappingGroup, EntityId } from "app/persistentState";
import { SmallIconButton } from "components/SmallIconButton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "components/scn-ui/Tooltip";
import {
  addCondition,
  addParameterMapping,
  getConditionsForMappingGroup,
  removeParameterMapping,
  removeParameterMappingGroup,
  updateParameterMapping,
  useDmxSerializer,
} from "./state";
import { DmxParameterMapping } from "./DmxParameterMapping";
import { DmxConditionTree } from "./DmxCondition";

interface DmxParameterGroupProps {
  chunkId: EntityId;
  mappingGroupId: EntityId;
  mappingGroup: DmxMappingGroup;
}

export const DmxParameterGroup = ({
  chunkId,
  mappingGroupId,
  mappingGroup,
}: DmxParameterGroupProps) => {
  const dmx = useDmxSerializer();
  const chunksCount = dmx ? Object.keys(dmx.chunks).length : 0;
  const conditions = dmx
    ? getConditionsForMappingGroup(dmx, mappingGroupId)
    : [];

  return (
    <div className="bg-gray-300 dark:bg-gray-700 my-2 p-1 rounded-lg">
      <div className="flex">
        <div className="font-bold mx-2 my-1">Parameter Group</div>
        <div className="grow" />
        <SmallIconButton
          onClick={() => removeParameterMappingGroup(chunkId, mappingGroupId)}
        >
          <TrashIcon />
        </SmallIconButton>
      </div>
      {mappingGroup.mappings.map((mapping, index) => (
        <DmxParameterMapping
          key={index}
          mapping={mapping}
          onUpdate={(newMapping) => {
            updateParameterMapping(mappingGroupId, index, newMapping);
          }}
          onRemove={() => removeParameterMapping(mappingGroupId, index)}
        />
      ))}
      <div className="font-bold m-2">Conditions</div>
      {conditions.map((condition) => (
        <DmxConditionTree
          key={condition.id}
          conditionId={condition.id}
          condition={condition}
          parentChunkId={chunkId}
        />
      ))}
      <div className="flex items-center my-1">
        <div className="grow" />
        <Tooltip>
          <TooltipTrigger asChild>
            <SmallIconButton
              onClick={() => addParameterMapping(mappingGroupId)}
            >
              <CalculatorIcon />
            </SmallIconButton>
          </TooltipTrigger>
          <TooltipContent>Add Parameter Mapping</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <SmallIconButton
              disabled={chunksCount <= 1}
              onClick={() => addCondition(mappingGroupId, chunkId)}
            >
              <FunnelIcon />
            </SmallIconButton>
          </TooltipTrigger>
          <TooltipContent>Add Condition</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
};

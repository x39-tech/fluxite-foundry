import { CirclePlusIcon, XIcon } from "lucide-react";
import { DmxMappingGroup, EntityId } from "app/persistentState";
import { Button } from "components/scn-ui/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "components/scn-ui/DropdownMenu";
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
    <div className="flex flex-col gap-4 rounded-lg border bg-sidebar p-4">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">Mapping Group</span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary"
              aria-label="Add to Mapping Group"
            >
              <CirclePlusIcon className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => addParameterMapping(mappingGroupId)}
            >
              Parameter Mapping
            </DropdownMenuItem>
            <DropdownMenuItem
              // A condition compares another slot group's value, so there has
              // to be one other than this group's own.
              disabled={chunksCount <= 1}
              onClick={() => addCondition(mappingGroupId, chunkId)}
            >
              Condition
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="grow" />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Remove Mapping Group"
          onClick={() => removeParameterMappingGroup(chunkId, mappingGroupId)}
        >
          <XIcon className="size-5" />
        </Button>
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
      {conditions.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-base font-semibold">Conditions</span>
          {conditions.map((condition) => (
            <DmxConditionTree
              key={condition.id}
              conditionId={condition.id}
              condition={condition}
              parentChunkId={chunkId}
            />
          ))}
        </div>
      )}
    </div>
  );
};

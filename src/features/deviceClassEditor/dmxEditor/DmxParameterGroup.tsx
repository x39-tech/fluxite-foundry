import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
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

const MESSAGES = {
  addToMappingGroup: msg({
    id: "deviceClassEditor.dmxGroup.addToMappingGroup",
    message: "Add to Mapping Group",
  }),
  removeMappingGroup: msg({
    id: "deviceClassEditor.dmxGroup.removeMappingGroup",
    message: "Remove Mapping Group",
  }),
};

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
  const { _ } = useLingui();

  const dmx = useDmxSerializer();
  const chunksCount = dmx ? Object.keys(dmx.chunks).length : 0;
  const conditions = dmx
    ? getConditionsForMappingGroup(dmx, mappingGroupId)
    : [];

  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-sidebar p-4">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">
          <Trans id="deviceClassEditor.dmxGroup.mappingGroup">
            Mapping Group
          </Trans>
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-primary"
              aria-label={_(MESSAGES.addToMappingGroup)}
            >
              <CirclePlusIcon className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onClick={() => addParameterMapping(mappingGroupId)}
            >
              <Trans id="deviceClassEditor.dmxGroup.parameterMapping">
                Parameter Mapping
              </Trans>
            </DropdownMenuItem>
            <DropdownMenuItem
              // A condition compares another slot group's value, so there has
              // to be one other than this group's own.
              disabled={chunksCount <= 1}
              onClick={() => addCondition(mappingGroupId, chunkId)}
            >
              <Trans id="deviceClassEditor.dmxGroup.condition">Condition</Trans>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="grow" />
        <Button
          variant="ghost"
          size="icon"
          aria-label={_(MESSAGES.removeMappingGroup)}
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
          <span className="text-base font-semibold">
            <Trans id="deviceClassEditor.dmxGroup.conditions">Conditions</Trans>
          </span>
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

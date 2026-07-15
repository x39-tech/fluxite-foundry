import { CircleQuestionMarkIcon, PlusIcon } from "lucide-react";
import { EntityId } from "app/persistentState";
import { Button } from "components/scn-ui/Button";
import { Label } from "components/scn-ui/Label";
import { FieldSet } from "components/FieldSet";
import { RenderError } from "components/RenderError";
import { TagInputField } from "components/EditorFields/TagInputField";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import {
  addParameterMappingGroup,
  changeDmxChunkOffsets,
  getMappingGroupsForChunk,
  useDmxSerializer,
} from "./state";
import { DmxParameterGroup } from "./DmxParameterGroup";

interface Props {
  chunkId: EntityId;
}

export const DmxChunkEditor = ({ chunkId }: Props) => {
  const dmx = useDmxSerializer();
  const chunk = dmx?.chunks[chunkId];

  if (!dmx || !chunk) {
    return <RenderError />;
  }

  const mappingGroups = getMappingGroupsForChunk(dmx, chunkId);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <FieldSet>
          <div className="flex items-center gap-2">
            <Label>Offsets Used</Label>
            <Tooltip>
              <TooltipTrigger>
                <CircleQuestionMarkIcon className="size-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                The DMX slot offsets this group occupies, relative to the start
                of the footprint.
              </TooltipContent>
            </Tooltip>
          </div>
          <TagInputField
            className="w-xs"
            aria-label="Offsets Used"
            values={chunk.offsets.map((offset) => offset.toString())}
            onValuesChanged={(newValues) =>
              changeDmxChunkOffsets(chunkId, newValues)
            }
          />
        </FieldSet>
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => addParameterMappingGroup(chunkId)}
        >
          <PlusIcon className="size-5" />
          Mapping Group
        </Button>
      </div>
      {mappingGroups.map((mappingGroup) => (
        <DmxParameterGroup
          key={mappingGroup.id}
          chunkId={chunkId}
          mappingGroupId={mappingGroup.id}
          mappingGroup={mappingGroup}
        />
      ))}
    </div>
  );
};

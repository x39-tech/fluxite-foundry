import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { MessageDescriptor } from "@lingui/core";
import { useState } from "react";
import { CircleQuestionMarkIcon, PlusIcon } from "lucide-react";
import { EntityId } from "app/persistentState";
import { Button } from "components/scn-ui/Button";
import { Label } from "components/scn-ui/Label";
import { FieldSet } from "components/FieldSet";
import { RenderError } from "components/RenderError";
import { TagInputField } from "components/EditorFields/TagInputField";
import { ValidationPopover } from "components/ValidationPopover";
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
  useEditedDmxSerializerId,
} from "./state";
import { DmxParameterGroup } from "./DmxParameterGroup";
import { parseSlotNumbers, slotNumberFromOffset } from "./slotNumbers";

const MESSAGES = {
  slotsUsed: msg({
    id: "deviceClassEditor.dmxChunk.slotsUsed",
    message: "Slots Used",
  }),
};

interface Props {
  chunkId: EntityId;
}

export const DmxChunkEditor = ({ chunkId }: Props) => {
  const { _ } = useLingui();

  const serializerId = useEditedDmxSerializerId();
  const [rejection, setRejection] = useState<MessageDescriptor>();
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
            <Label>
              <Trans id="deviceClassEditor.dmxChunk.slotsUsed">
                Slots Used
              </Trans>
            </Label>
            <Tooltip>
              <TooltipTrigger>
                <CircleQuestionMarkIcon className="size-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <Trans id="deviceClassEditor.dmxChunk.slotsUsedHelp">
                  DMX slots are numbered from 1 at the beginning of the
                  device&apos;s footprint. Slots are ordered from most to least
                  significant byte.
                </Trans>
              </TooltipContent>
            </Tooltip>
          </div>
          <ValidationPopover
            result={{ isValid: rejection === undefined, feedback: rejection }}
          >
            <div onBlur={() => setRejection(undefined)}>
              <TagInputField
                className="w-xs"
                aria-label={_(MESSAGES.slotsUsed)}
                values={chunk.offsets.map((offset) =>
                  slotNumberFromOffset(offset).toString(),
                )}
                onValuesChanged={(newValues) => {
                  const result = parseSlotNumbers(newValues, dmx, chunkId);
                  if (!result.isValid) {
                    setRejection(result.feedback);
                    return;
                  }
                  setRejection(undefined);
                  changeDmxChunkOffsets(serializerId, chunkId, result.offsets);
                }}
              />
            </div>
          </ValidationPopover>
        </FieldSet>
        <Button
          variant="ghost"
          className="text-primary"
          onClick={() => addParameterMappingGroup(serializerId, chunkId)}
        >
          <PlusIcon className="size-5" />
          <Trans id="deviceClassEditor.dmxChunk.mappingGroup">
            Mapping Group
          </Trans>
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

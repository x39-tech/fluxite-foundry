import {
  DmxChunkRefCondition,
  DmxCondition,
  EntityId,
} from "app/persistentState";
import { TrashIcon } from "@heroicons/react/24/solid";
import { TextEditorField } from "components/EditorFields/DeprecatedTextEditorField";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import { StringSelector } from "components/StringSelector";
import { SmallIconButton } from "components/SmallIconButton";
import {
  getChildConditions,
  removeCondition,
  updateCondition,
  updateConditionMatch,
  useDmxSerializer,
} from "./state";

interface DmxConditionTreeProps {
  conditionId: EntityId;
  condition: DmxCondition;
  parentChunkId: EntityId;
}

export const DmxConditionTree = ({
  conditionId,
  condition,
  parentChunkId,
}: DmxConditionTreeProps) => {
  const dmx = useDmxSerializer();

  if (condition.conditionType === "chunkRef") {
    return (
      <DmxChunkRefConditionView
        conditionId={conditionId}
        condition={condition}
        parentChunkId={parentChunkId}
      />
    );
  } else if (condition.conditionType === "group") {
    const childConditions = dmx ? getChildConditions(dmx, conditionId) : [];

    return (
      <div className="flex flex-col items-start">
        {childConditions.map((childCondition, index) => {
          const elements = [];

          if (index === 1) {
            // First separator is a selector
            elements.push(
              <Select
                key={`sep-${index}`}
                value={condition.match === "any" ? "OR" : "AND"}
                onValueChange={(value) => {
                  updateConditionMatch(
                    conditionId,
                    value === "OR" ? "any" : "all",
                  );
                }}
              >
                <SelectTrigger className="m-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AND">AND</SelectItem>
                  <SelectItem value="OR">OR</SelectItem>
                </SelectContent>
              </Select>,
            );
          } else if (index > 1) {
            elements.push(
              <div key={`sep-${index}`} className="m-2 font-bold">
                {condition.match === "any" ? "OR" : "AND"}
              </div>,
            );
          }

          elements.push(
            <div key={childCondition.id}>
              <DmxConditionTree
                conditionId={childCondition.id}
                condition={childCondition}
                parentChunkId={parentChunkId}
              />
            </div>,
          );

          return elements;
        })}
      </div>
    );
  }

  return <>Invalid condition data</>;
};

interface DmxChunkRefConditionViewProps {
  conditionId: EntityId;
  condition: DmxChunkRefCondition;
  parentChunkId: EntityId;
}

const DmxChunkRefConditionView = ({
  conditionId,
  condition,
  parentChunkId,
}: DmxChunkRefConditionViewProps) => {
  const dmx = useDmxSerializer();

  if (!dmx) {
    return null;
  }

  const availableChunkIds = Object.keys(dmx.chunks).filter(
    (id) => id !== parentChunkId,
  ) as EntityId[];

  const displayNames = availableChunkIds.map((chunkId) => {
    const chunk = dmx.chunks[chunkId];
    return chunk ? `Slot ${chunk.offsets.join(", ")}` : chunkId;
  });

  return (
    <div className="mx-2 flex items-center">
      <StringSelector
        items={availableChunkIds}
        displayNames={displayNames}
        selectedItem={condition.chunkId}
        placeholderText="Select a slot..."
        onSelectedItemChanged={(newChunkId) =>
          updateCondition(conditionId, {
            ...condition,
            chunkId: newChunkId as EntityId,
          })
        }
      />
      <span className="mx-2">is between</span>
      <TextEditorField
        value={condition.chunkStart.toString()}
        onValueChanged={(newValue) => {
          try {
            updateCondition(conditionId, {
              ...condition,
              chunkStart: parseInt(newValue),
            });
          } catch (_) {
            // No update
          }
        }}
      />
      <span className="mx-2">and</span>
      <TextEditorField
        value={condition.chunkEnd.toString()}
        onValueChanged={(newValue) => {
          try {
            updateCondition(conditionId, {
              ...condition,
              chunkEnd: parseInt(newValue),
            });
          } catch (_) {
            // No update
          }
        }}
      />
      <SmallIconButton
        className="mx-1"
        onClick={() => removeCondition(conditionId)}
        aria-label="Delete condition"
      >
        <TrashIcon />
      </SmallIconButton>
    </div>
  );
};

import { Fragment } from "react";
import {
  DmxChunkRefCondition,
  DmxCondition,
  EntityId,
} from "app/persistentState";
import { TextEditorField } from "components/EditorFields/TextEditorField";
import { SelectField } from "components/EditorFields/SelectField";
import { StringSelector } from "components/StringSelector";
import { Button } from "components/scn-ui/Button";
import { Separator } from "components/scn-ui/Separator";
import {
  dmxChunkLabel,
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
      <div className="flex flex-col">
        {childConditions.map((childCondition, index) => (
          <Fragment key={childCondition.id}>
            {index > 0 && (
              <ConditionMatchDivider
                match={condition.match}
                // Only the first divider sets the match; the rest just report
                // it, since one group matches the same way throughout.
                editable={index === 1}
                onMatchChanged={(newMatch) =>
                  updateConditionMatch(conditionId, newMatch)
                }
              />
            )}
            <DmxConditionTree
              conditionId={childCondition.id}
              condition={childCondition}
              parentChunkId={parentChunkId}
            />
          </Fragment>
        ))}
      </div>
    );
  }

  return <>Invalid condition data</>;
};

interface ConditionMatchDividerProps {
  match: "any" | "all";
  editable: boolean;
  onMatchChanged: (match: "any" | "all") => void;
}

const ConditionMatchDivider = ({
  match,
  editable,
  onMatchChanged,
}: ConditionMatchDividerProps) => {
  return (
    <div className="relative flex items-center justify-center py-2">
      <Separator className="absolute" />
      {editable ? (
        <SelectField
          className="relative w-24 bg-background"
          aria-label="Match"
          values={["all", "any"]}
          displayValues={["And", "Or"]}
          selectedValue={match}
          onSelectionChanged={(newValue) =>
            onMatchChanged(newValue as "any" | "all")
          }
        />
      ) : (
        <span className="relative rounded-md border bg-background px-3 py-1.5 text-sm font-medium">
          {match === "any" ? "Or" : "And"}
        </span>
      )}
    </div>
  );
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
    return chunk ? dmxChunkLabel(chunk.offsets) : chunkId;
  });

  return (
    <div className="flex items-center gap-3">
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
      <span className="text-sm">is between</span>
      <TextEditorField
        className="w-24"
        aria-label="Range start"
        value={condition.chunkStart.toString()}
        onConfirm={(newValue) => {
          const parsed = parseInt(newValue);
          if (isNaN(parsed)) return;
          updateCondition(conditionId, {
            ...condition,
            chunkStart: parsed,
          });
        }}
      />
      <TextEditorField
        className="w-24"
        aria-label="Range end"
        value={condition.chunkEnd.toString()}
        onConfirm={(newValue) => {
          const parsed = parseInt(newValue);
          if (isNaN(parsed)) return;
          updateCondition(conditionId, {
            ...condition,
            chunkEnd: parsed,
          });
        }}
      />
      <div className="grow" />
      <Button
        variant="ghost"
        className="text-primary"
        aria-label="Delete condition"
        onClick={() => removeCondition(conditionId)}
      >
        Remove
      </Button>
    </div>
  );
};

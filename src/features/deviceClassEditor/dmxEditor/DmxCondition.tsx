import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
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

const MESSAGES = {
  selectSlot: msg({
    id: "deviceClassEditor.dmxCondition.selectSlot",
    message: "Select a slot...",
  }),
  match: msg({ id: "deviceClassEditor.dmxCondition.match", message: "Match" }),
  rangeStart: msg({
    id: "deviceClassEditor.dmxCondition.rangeStart",
    message: "Range start",
  }),
  rangeEnd: msg({
    id: "deviceClassEditor.dmxCondition.rangeEnd",
    message: "Range end",
  }),
  deleteCondition: msg({
    id: "deviceClassEditor.dmxCondition.deleteCondition",
    message: "Delete condition",
  }),
  matchAll: msg({
    id: "deviceClassEditor.dmxCondition.matchAll",
    message: "And",
    comment: "Logical AND",
  }),
  matchAny: msg({
    id: "deviceClassEditor.dmxCondition.matchAny",
    message: "Or",
    comment: "Logical OR",
  }),
};

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

  return (
    <>
      <Trans id="deviceClassEditor.dmxCondition.invalid">
        Invalid condition data
      </Trans>
    </>
  );
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
  const { _ } = useLingui();

  return (
    <div className="relative flex items-center justify-center py-2">
      <Separator className="absolute" />
      {editable ? (
        <SelectField
          className="relative w-24 bg-background"
          aria-label={_(MESSAGES.match)}
          values={["all", "any"]}
          displayValues={[_(MESSAGES.matchAll), _(MESSAGES.matchAny)]}
          selectedValue={match}
          onSelectionChanged={(newValue) =>
            onMatchChanged(newValue as "any" | "all")
          }
        />
      ) : (
        <span className="relative rounded-md border bg-background px-3 py-1.5 text-sm font-medium">
          {match === "any" ? _(MESSAGES.matchAny) : _(MESSAGES.matchAll)}
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
  const { _ } = useLingui();

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
        placeholderText={MESSAGES.selectSlot}
        onSelectedItemChanged={(newChunkId) =>
          updateCondition(conditionId, {
            ...condition,
            chunkId: newChunkId as EntityId,
          })
        }
      />
      <span className="text-sm">
        <Trans
          id="deviceClassEditor.dmxCondition.isBetween"
          comment="Full form: '{slot ID} is between {number selector} {number selector}'"
        >
          is between
        </Trans>
      </span>
      <TextEditorField
        className="w-24"
        aria-label={_(MESSAGES.rangeStart)}
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
        aria-label={_(MESSAGES.rangeEnd)}
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
        aria-label={_(MESSAGES.deleteCondition)}
        onClick={() => removeCondition(conditionId)}
      >
        <Trans id="deviceClassEditor.dmxCondition.remove">Remove</Trans>
      </Button>
    </div>
  );
};

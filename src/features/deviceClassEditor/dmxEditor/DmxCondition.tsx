import { Chunk, Condition } from "e173";
import { Button } from "components/Button";
import { TextEditorField } from "components/EditorFields/TextEditorField";
import { Select } from "components/Select";
import { StringSelector } from "components/StringSelector";

// TODO: support arbitrarily nested conditions

interface DmxConditionProps {
  condition: Condition;
  parentChunkId: string;
  chunks: Record<string, Chunk>;
  onUpdate: (condition: Condition) => void;
  onRemove: () => void;
}

export const DmxCondition = ({
  condition,
  chunks,
  parentChunkId,
  onUpdate,
  onRemove,
}: DmxConditionProps) => {
  if (
    condition.chunk !== undefined &&
    condition.chunkStart !== undefined &&
    condition.chunkEnd !== undefined
  ) {
    return (
      <DmxMappingCondition
        chunkId={condition.chunk}
        parentChunkId={parentChunkId}
        chunks={chunks}
        dmxStart={condition.chunkStart}
        dmxEnd={condition.chunkEnd}
        onUpdate={onUpdate}
        onRemove={onRemove}
      />
    );
  } else if (
    condition.conditions !== undefined &&
    condition.match !== undefined
  ) {
    return (
      <div className="flex flex-col items-start">
        {condition.conditions.map((subCondition, index) => {
          const sep = [<></>];

          if (index == 1) {
            // First separator is a selector
            sep.push(
              <Select
                className="m-2"
                options={["AND", "OR"]}
                value={condition.match === "any" ? "OR" : "AND"}
                onChange={(event) => {
                  onUpdate({
                    ...condition,
                    match: event.currentTarget.value == "OR" ? "any" : "all",
                  });
                }}
              />,
            );
          } else if (index > 1) {
            sep.push(
              <div key={(index - 1) * 2 + 1} className="m-2 font-bold">
                {condition.match == "any" ? "OR" : "AND"}
              </div>,
            );
          }

          sep.push(
            <div>
              <DmxCondition
                key={index * 2}
                condition={subCondition}
                chunks={chunks}
                parentChunkId={parentChunkId}
                onUpdate={(newSubCondition) =>
                  onUpdate({
                    ...condition,
                    conditions: [
                      ...condition.conditions!.slice(0, index),
                      newSubCondition,
                      ...condition.conditions!.slice(index + 1),
                    ],
                  })
                }
                onRemove={() => {
                  onUpdate({
                    ...condition,
                    conditions: condition.conditions!.filter((_, i) => {
                      return i != index;
                    }),
                  });
                }}
              />
            </div>,
          );

          return sep;
        })}
      </div>
    );
  } else {
    return <>Invalid condition data</>;
  }
};

interface DmxMappingConditionProps {
  chunkId: string;
  parentChunkId: string;
  chunks: Record<string, Chunk>;
  dmxStart: number;
  dmxEnd: number;
  onUpdate: (condition: Condition) => void;
  onRemove: () => void;
}

const DmxMappingCondition = ({
  chunkId,
  parentChunkId,
  chunks,
  dmxStart,
  dmxEnd,
  onUpdate,
  onRemove,
}: DmxMappingConditionProps) => {
  const availableChunkIds = Object.keys(chunks).filter(
    (chunkId) => chunkId != parentChunkId,
  );
  const displayNames = availableChunkIds.map((chunkId) => {
    return `Slot ${chunks[chunkId].offsets.join(", ")}`;
  });

  return (
    <div className="mx-2 flex items-center">
      <StringSelector
        items={availableChunkIds}
        displayNames={displayNames}
        selectedItem={chunkId}
        placeholderText="Select a slot..."
        onSelectedItemChanged={(newValue) =>
          onUpdate({
            chunk: newValue,
            chunkStart: dmxStart,
            chunkEnd: dmxEnd,
          })
        }
      />
      <span className="mx-2">is between</span>
      <TextEditorField
        value={dmxStart.toString()}
        onValueChanged={(newValue) => {
          try {
            onUpdate({
              chunk: chunkId,
              chunkStart: parseInt(newValue),
              chunkEnd: dmxEnd,
            });
          } catch (_) {
            // No update
          }
        }}
      />
      <span className="mx-2">and</span>
      <TextEditorField
        value={dmxEnd.toString()}
        onValueChanged={(newValue) => {
          try {
            onUpdate({
              chunk: chunkId,
              chunkStart: dmxStart,
              chunkEnd: parseInt(newValue),
            });
          } catch (_) {
            // No update
          }
        }}
      />
      <Button
        minimal
        className="mx-1"
        icon="TrashIcon"
        onClick={onRemove}
        aria-label="Delete condition"
      />
    </div>
  );
};

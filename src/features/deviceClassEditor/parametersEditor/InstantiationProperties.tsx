import { useId } from "react";
import { Draft } from "immer";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { SelectField } from "components/EditorFields/SelectField";
import { IntegerInput } from "components/IntegerInput";
import { LocalizedParameter, modifyParameter } from "./state";
import { EntityId, Parameter } from "app/persistentState";
import { Unlocalized } from "features/localizations/types";

const instantiationTypes = {
  SINGLE: "Single",
  MULTIPLE: "Multiple",
  DYNAMIC: "Dynamic",
} as const;

type InstantiationType =
  (typeof instantiationTypes)[keyof typeof instantiationTypes];

interface Props {
  paramId: EntityId;
  param: LocalizedParameter;
}

export const InstantiationProperties = ({ paramId, param }: Props) => {
  const idPrefix = useId();

  const instantiationType =
    param.count === undefined
      ? instantiationTypes.SINGLE
      : param.count.type === "dynamic"
        ? instantiationTypes.DYNAMIC
        : instantiationTypes.MULTIPLE;

  return (
    <>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-instances`}>Instances</Label>
        <SelectField
          id={`${idPrefix}-instances`}
          values={Object.values(instantiationTypes)}
          selectedValue={instantiationType}
          onSelectionChanged={(newValue) =>
            modifyParameter(paramId, (draft) =>
              changeInstantiationType(draft, newValue as InstantiationType),
            )
          }
        />
      </FieldSet>
      {param.count?.type === "fixed" && (
        <FieldSet>
          <Label htmlFor={`${idPrefix}-instanceCount`}>Instance Count</Label>
          <IntegerInput
            id={`${idPrefix}-instanceCount`}
            className="w-xs"
            value={param.count.value}
            min={1}
            onValueChange={(newValue) =>
              newValue &&
              modifyParameter(paramId, (draft) => {
                draft.count = { type: "fixed", value: newValue };
              })
            }
          />
        </FieldSet>
      )}
      {param.count?.type === "dynamic" && (
        <DynamicCountInputs paramId={paramId} count={param.count} />
      )}
    </>
  );
};

interface DynamicCountInputsProps {
  paramId: EntityId;
  count: Extract<Parameter["count"], { type: "dynamic" }>;
}

const DynamicCountInputs = ({ paramId, count }: DynamicCountInputsProps) => {
  const idPrefix = useId();

  return (
    <>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-minCount`}>Minimum Instance Count</Label>
        <IntegerInput
          id={`${idPrefix}-minCount`}
          className="w-xs"
          value={count.min}
          min={1}
          onValueChange={(newValue) =>
            newValue &&
            modifyParameter(paramId, (draft) => {
              const currentMax =
                draft.count?.type === "dynamic" ? draft.count.max : count.max;
              draft.count = {
                type: "dynamic",
                min: newValue,
                max: currentMax,
              };
            })
          }
          onValueConfirm={(newValue) => {
            // On blur, adjust max up if min exceeds it
            if (newValue === null) return;
            modifyParameter(paramId, (draft) => {
              if (draft.count?.type !== "dynamic") return;
              if (draft.count.max !== undefined && draft.count.max < newValue) {
                draft.count.max = newValue;
              }
            });
          }}
        />
      </FieldSet>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-maxCount`}>Maximum Instance Count</Label>
        <IntegerInput
          clearable
          id={`${idPrefix}-maxCount`}
          className="w-xs"
          value={count.max ?? null}
          placeholder="(no maximum)"
          min={1}
          onValueChange={(newValue) => {
            modifyParameter(paramId, (draft) => {
              const currentMin =
                draft.count?.type === "dynamic" ? draft.count.min : count.min;
              draft.count = {
                type: "dynamic",
                min: currentMin,
                max: newValue || undefined,
              };
            });
          }}
          onValueConfirm={(newValue) => {
            // On blur, adjust min down if max is below it
            if (newValue === null) return;
            modifyParameter(paramId, (draft) => {
              if (draft.count?.type !== "dynamic") return;
              if (draft.count.min > newValue) {
                draft.count.min = newValue;
              }
            });
          }}
        />
      </FieldSet>
    </>
  );
};

function changeInstantiationType(
  draft: Draft<Unlocalized<Parameter>>,
  newType: InstantiationType,
) {
  switch (newType) {
    case instantiationTypes.SINGLE:
      delete draft.count;
      break;
    case instantiationTypes.MULTIPLE:
      draft.count = { type: "fixed", value: 1 };
      break;
    case instantiationTypes.DYNAMIC:
      draft.count = { type: "dynamic", min: 1 };
      break;
  }
}

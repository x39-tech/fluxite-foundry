import { SelectTableRow } from "components/EditorFields/DeprecatedSelectField";
import { LocalizedParameter, modifyParameter } from "./state";
import { IntegerInputTableRow } from "components/EditorFields/IntegerInputField";
import { Draft } from "immer";
import { EntityId, Parameter, Unlocalized } from "app/persistentState";

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
  const instantiationType =
    param.count === undefined
      ? instantiationTypes.SINGLE
      : param.count.type === "dynamic"
        ? instantiationTypes.DYNAMIC
        : instantiationTypes.MULTIPLE;

  return (
    <>
      <SelectTableRow
        label="Instances"
        values={Object.values(instantiationTypes)}
        selectedValue={instantiationType}
        onSelectionChanged={(newValue) =>
          modifyParameter(paramId, (draft) =>
            changeInstantiationType(draft, newValue as InstantiationType),
          )
        }
      />
      {param.count?.type === "fixed" ? (
        <IntegerInputTableRow
          label="Instance Count"
          value={param.count.value}
          min={1}
          onValueChange={(newValue) =>
            newValue &&
            modifyParameter(paramId, (draft) => {
              draft.count = { type: "fixed", value: newValue };
            })
          }
        />
      ) : (
        <></>
      )}
      {param.count?.type === "dynamic" ? (
        <DynamicCountInputs paramId={paramId} count={param.count} />
      ) : (
        <></>
      )}
    </>
  );
};

interface DynamicCountInputsProps {
  paramId: EntityId;
  count: Extract<Parameter["count"], { type: "dynamic" }>;
}

const DynamicCountInputs = ({ paramId, count }: DynamicCountInputsProps) => {
  return (
    <>
      <IntegerInputTableRow
        label="Minimum Instance Count"
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
      <IntegerInputTableRow
        clearable
        label="Maximum Instance Count"
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

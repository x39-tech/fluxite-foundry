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
  return (
    <>
      <SelectTableRow
        label="Instances"
        values={Object.values(instantiationTypes)}
        selectedValue={
          param.dynamicMinimum
            ? instantiationTypes.DYNAMIC
            : param.count
              ? instantiationTypes.MULTIPLE
              : instantiationTypes.SINGLE
        }
        onSelectionChanged={(newValue) =>
          modifyParameter(paramId, (draft) =>
            changeInstantiationType(draft, newValue as InstantiationType),
          )
        }
      />
      {param.count ? (
        <IntegerInputTableRow
          label="Instance Count"
          value={param.count ?? null}
          min={1}
          onValueChange={(newValue) =>
            newValue &&
            modifyParameter(paramId, (draft) => {
              draft.count = newValue || undefined;
            })
          }
        />
      ) : (
        <></>
      )}
      {param.dynamicMinimum ? (
        <>
          <IntegerInputTableRow
            label="Minimum Instance Count"
            value={param.dynamicMinimum ?? null}
            min={1}
            onValueChange={(newValue) =>
              newValue &&
              modifyParameter(paramId, (draft) => {
                draft.dynamicMinimum = newValue;
                if (
                  draft.dynamicMaximum !== undefined &&
                  draft.dynamicMaximum < newValue
                ) {
                  draft.dynamicMaximum = newValue;
                }
              })
            }
          />
          <IntegerInputTableRow
            clearable
            label="Maximum Instance Count"
            value={param.dynamicMaximum ?? null}
            placeholder="(no maximum)"
            min={1}
            onValueChange={(newValue) => {
              modifyParameter(paramId, (draft) => {
                draft.dynamicMaximum = newValue || undefined;
                if (newValue !== null && draft.dynamicMinimum! > newValue) {
                  draft.dynamicMinimum = newValue;
                }
              });
            }}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
};

function changeInstantiationType(
  draft: Draft<Unlocalized<Parameter>>,
  newType: InstantiationType,
) {
  switch (newType) {
    case instantiationTypes.SINGLE:
      delete draft.dynamicMinimum;
      delete draft.dynamicMaximum;
      delete draft.count;
      break;
    case instantiationTypes.MULTIPLE:
      delete draft.dynamicMinimum;
      delete draft.dynamicMaximum;
      draft.count = 1;
      break;
    case instantiationTypes.DYNAMIC:
      delete draft.count;
      draft.dynamicMinimum = 1;
      break;
  }
}

import { useId } from "react";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { LocalizedParameter, modifyParameter } from "./state";
import {
  validateStringIsNumberAndBetweenMinAndMaxOrEmpty,
  validateStringIsNumberOrEmpty,
} from "utils/inputValidation";
import { EntityId } from "app/persistentState";

interface Props {
  paramId: EntityId;
  param: LocalizedParameter;
}

export const MinMaxDefaultProperties = ({ paramId, param }: Props) => {
  const idPrefix = useId();

  return (
    <>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-minimum`}>Minimum Value</Label>
        <ValidatedInput
          id={`${idPrefix}-minimum`}
          value={param.minimum !== undefined ? `${param.minimum}` : ""}
          onConfirm={(newValue) =>
            modifyParameter(paramId, (draft) => {
              draft.minimum = parseIfNotEmpty(newValue);
            })
          }
          validator={validateStringIsNumberOrEmpty}
        />
      </FieldSet>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-maximum`}>Maximum Value</Label>
        <ValidatedInput
          id={`${idPrefix}-maximum`}
          value={param.maximum !== undefined ? `${param.maximum}` : ""}
          onConfirm={(newValue) =>
            modifyParameter(paramId, (draft) => {
              draft.maximum = parseIfNotEmpty(newValue);
            })
          }
          validator={validateStringIsNumberOrEmpty}
        />
      </FieldSet>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-default`}>Default Value</Label>
        <ValidatedInput
          id={`${idPrefix}-default`}
          value={param.default !== undefined ? `${param.default}` : ""}
          onConfirm={(newValue) =>
            modifyParameter(paramId, (draft) => {
              draft.default = parseIfNotEmpty(newValue);
            })
          }
          validator={(input) =>
            validateStringIsNumberAndBetweenMinAndMaxOrEmpty(
              input,
              // TODO: Fix to handle booleans
              param.minimum as number | undefined,
              param.maximum as number | undefined,
            )
          }
        />
      </FieldSet>
    </>
  );
};

function parseIfNotEmpty(value: string): number | undefined {
  return value === "" ? undefined : parseFloat(value);
}

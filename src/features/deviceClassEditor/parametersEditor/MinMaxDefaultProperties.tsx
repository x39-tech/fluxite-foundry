import { Trans } from "@lingui/react/macro";
import { useId } from "react";
import { FieldSet } from "components/FieldSet";
import { LabeledCheckbox } from "components/LabeledCheckbox";
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
        <Label htmlFor={`${idPrefix}-minimum`}>
          <Trans id="deviceClassEditor.paramMinMaxDefault.minimumValue">
            Minimum Value
          </Trans>
        </Label>
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
        <Label htmlFor={`${idPrefix}-maximum`}>
          <Trans id="deviceClassEditor.paramMinMaxDefault.maximumValue">
            Maximum Value
          </Trans>
        </Label>
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
        <Label htmlFor={`${idPrefix}-default`}>
          <Trans id="deviceClassEditor.paramMinMaxDefault.defaultValue">
            Default Value
          </Trans>
        </Label>
        <div className="flex items-center gap-4">
          <ValidatedInput
            id={`${idPrefix}-default`}
            disabled={param.default?.type === "inactive"}
            value={
              param.default && param.default.type !== "inactive"
                ? `${param.default.value}`
                : ""
            }
            onConfirm={(newValue) =>
              modifyParameter(paramId, (draft) => {
                const value = parseIfNotEmpty(newValue);
                draft.default =
                  value === undefined ? undefined : { type: "numeric", value };
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
          {/* An inactive default means the parameter is explicitly inactive,
              as opposed to having no default at all. */}
          <LabeledCheckbox
            checked={param.default?.type === "inactive"}
            onChange={(checked) =>
              modifyParameter(paramId, (draft) => {
                draft.default = checked ? { type: "inactive" } : undefined;
              })
            }
          >
            <Trans id="deviceClassEditor.paramMinMaxDefault.inactiveByDefault">
              Inactive by default
            </Trans>
          </LabeledCheckbox>
        </div>
      </FieldSet>
    </>
  );
};

function parseIfNotEmpty(value: string): number | undefined {
  return value === "" ? undefined : parseFloat(value);
}

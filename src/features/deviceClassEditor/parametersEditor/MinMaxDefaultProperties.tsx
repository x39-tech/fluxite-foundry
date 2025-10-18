import { OptionalTextEditorTableRow } from "components/EditorFields/DeprecatedTextEditorField";
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
  return (
    <>
      <OptionalTextEditorTableRow
        label="Minimum Value"
        value={param.minimum !== undefined ? `${param.minimum}` : ""}
        onValueChanged={(newValue) =>
          modifyParameter(paramId, (draft) => {
            draft.minimum = parseIfNotUndefined(newValue);
          })
        }
        validator={validateStringIsNumberOrEmpty}
      />
      <OptionalTextEditorTableRow
        label="Maximum Value"
        value={param.maximum !== undefined ? `${param.maximum}` : undefined}
        onValueChanged={(newValue) =>
          modifyParameter(paramId, (draft) => {
            draft.maximum = parseIfNotUndefined(newValue);
          })
        }
        validator={validateStringIsNumberOrEmpty}
      />
      <OptionalTextEditorTableRow
        label="Default Value"
        value={param.default !== undefined ? `${param.default}` : undefined}
        onValueChanged={(newValue) =>
          modifyParameter(paramId, (draft) => {
            draft.default = parseIfNotUndefined(newValue);
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
    </>
  );
};

function parseIfNotUndefined(value?: string): number | undefined {
  return value === undefined ? value : parseFloat(value);
}

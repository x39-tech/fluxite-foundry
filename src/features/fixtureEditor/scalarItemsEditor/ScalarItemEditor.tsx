import { Callout, Colors } from "@blueprintjs/core";
import { useAppDispatch } from "app/hooks";
import { AppDispatch } from "app/store";
import produce from "immer";
import { ScalarItem } from "udr/objects/item";
import { ScalarItemClass } from "udr/objects/itemClass";
import { Access, DataType, Lifetime } from "udr/util/enums";
import {
  ClearableNumericInputTableRow,
  NumericInputTableRow,
} from "utils/components/EditorFields/NumericInputField";
import { SelectTableRow } from "utils/components/EditorFields/SelectField";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { ItemEditor } from "utils/components/ItemEditor/ItemEditor";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { DispatchOnChangeFactory } from "utils/dispatchOnChangeFactory";
import {
  InputValidationResult,
  validateStringIsNumberOrEmpty,
} from "utils/inputValidation";
import { lookupScalarItemClass } from "utils/scalarItemDatabase";
import { updateScalarItem, updateScalarItemId } from "../fixtureEditorSlice";
import "./ScalarItemEditor.css";

enum ScalarItemInstantiationType {
  SINGLE = "Single",
  MULTIPLE = "Multiple",
  DYNAMIC = "Dynamic",
}

function stringIsNumberAndBetweenMinAndMax(
  input: string,
  udr: ScalarItem
): InputValidationResult {
  const defaultResult = validateStringIsNumberOrEmpty(input);
  if (!defaultResult.isValid) {
    return defaultResult;
  }
  // Gotten this far, we know this is a valid number
  const inputAsNum = parseFloat(input);
  if (
    (udr.minimum !== undefined && inputAsNum < udr.minimum) ||
    (udr.maximum !== undefined && inputAsNum > udr.maximum)
  ) {
    return {
      isValid: false,
      feedback: "Input must be between minimum and maximum value",
    };
  }
  return { isValid: true };
}

function getInstantiationProperties(
  udr: ScalarItem,
  onChangeFactory: DispatchOnChangeFactory<ScalarItem>
): JSX.Element {
  return (
    <>
      <SelectTableRow
        label="Instances"
        values={Object.values(ScalarItemInstantiationType)}
        selectedValue={
          udr.dynamicMinimum
            ? ScalarItemInstantiationType.DYNAMIC
            : udr.count
            ? ScalarItemInstantiationType.MULTIPLE
            : ScalarItemInstantiationType.SINGLE
        }
        onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
          switch (newValue as ScalarItemInstantiationType) {
            case ScalarItemInstantiationType.SINGLE:
              delete draft.dynamicMinimum;
              delete draft.dynamicMaximum;
              delete draft.count;
              break;
            case ScalarItemInstantiationType.MULTIPLE:
              delete draft.dynamicMinimum;
              delete draft.dynamicMaximum;
              draft.count = 1;
              break;
            case ScalarItemInstantiationType.DYNAMIC:
              delete draft.count;
              draft.dynamicMinimum = 1;
              break;
          }
        })}
      />
      {udr.count ? (
        <NumericInputTableRow
          label="Instance Count"
          value={udr.count || ""}
          min={1}
          minorStepSize={null}
          onValueChange={onChangeFactory.getFn((draft, newValue) => {
            draft.count = newValue;
          })}
        />
      ) : (
        <></>
      )}
      {udr.dynamicMinimum ? (
        <>
          <NumericInputTableRow
            label="Minimum Instance Count"
            value={udr.dynamicMinimum || ""}
            min={1}
            minorStepSize={null}
            onValueChange={onChangeFactory.getFn((draft, newValue) => {
              draft.dynamicMinimum = newValue;
              if (
                draft.dynamicMaximum !== undefined &&
                draft.dynamicMaximum < newValue
              ) {
                draft.dynamicMaximum = newValue;
              }
            })}
          />
          <ClearableNumericInputTableRow
            label="Maximum Instance Count"
            value={udr.dynamicMaximum || ""}
            placeholder="(no maximum)"
            min={1}
            minorStepSize={null}
            onValueChange={onChangeFactory.getFn((draft, newValue) => {
              draft.dynamicMaximum = newValue;
              if (newValue !== undefined && draft.dynamicMinimum! > newValue) {
                draft.dynamicMinimum = newValue;
              }
            })}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
}

function getMinMaxDefaultProperties(
  id: string,
  udr: ScalarItem,
  itemClass: ScalarItemClass,
  onChangeFactory: DispatchOnChangeFactory<ScalarItem>
): JSX.Element {
  return (
    <>
      <TextEditorTableRow
        label="Minimum Value"
        defaultValue={`${udr.minimum}`}
        onValueChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.minimum = parseFloat(newValue);
        })}
        validator={validateStringIsNumberOrEmpty}
      />
      <TextEditorTableRow
        label="Maximum Value"
        defaultValue={`${udr.maximum}`}
        onValueChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.maximum = parseFloat(newValue);
        })}
        validator={validateStringIsNumberOrEmpty}
      />
      <TextEditorTableRow
        label="Default Value"
        defaultValue={udr.default ? `${udr.default}` : undefined}
        onValueChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.default = parseFloat(newValue);
        })}
        validator={(input) => stringIsNumberAndBetweenMinAndMax(input, udr)}
      />
    </>
  );
}

function getScalarItemPropsTable(
  id: string,
  udr: ScalarItem,
  itemClass: ScalarItemClass,
  dispatch: AppDispatch
): JSX.Element {
  const onChangeFactory = new DispatchOnChangeFactory(
    udr,
    (newValue, changeRecipe) => {
      dispatch(
        updateScalarItem({
          id,
          newValue: produce(udr, (draft) => changeRecipe(draft, newValue)),
        })
      );
    }
  );

  return (
    <SimplePropsTable>
      <tr>
        <td>Class</td>
        <td>
          <pre>{udr.class}</pre>
        </td>
      </tr>
      <TextEditorTableRow
        label="ID"
        defaultValue={id}
        onValueChanged={(newValue) => {
          dispatch(updateScalarItemId({ id, newId: newValue }));
        }}
      />
      <TextEditorTableRow
        label="Display Name"
        defaultValue={udr.friendlyName}
        onValueChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.friendlyName = newValue;
        })}
      />
      <SelectTableRow
        label="Access"
        values={
          udr.lifetime === Lifetime.STATIC
            ? Object.values(Access).filter(
                (value) => value !== Access.READWRITE
              )
            : Object.values(Access)
        }
        selectedValue={udr.access}
        onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.access = newValue as Access;
        })}
      />
      <SelectTableRow
        label="Lifetime"
        values={Object.values(Lifetime)}
        selectedValue={udr.lifetime}
        onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.lifetime = newValue as Lifetime;
          if (
            newValue === Lifetime.STATIC &&
            draft.access === Access.READWRITE
          ) {
            draft.access = Access.READONLY;
          }
        })}
      />
      {getInstantiationProperties(udr, onChangeFactory)}
      {itemClass.dataType === DataType.NUMBER ? (
        getMinMaxDefaultProperties(id, udr, itemClass, onChangeFactory)
      ) : (
        <></>
      )}
    </SimplePropsTable>
  );
}

function getClassNotFoundMessage(className: string): JSX.Element {
  return (
    <Callout intent="warning">
      Class <pre>{className}</pre> not found. This may be an indication of
      invalid UDR.
    </Callout>
  );
}

export interface ScalarItemEditorProps {
  id: string;
  udr: ScalarItem;
}

export const ScalarItemEditor: React.FC<ScalarItemEditorProps> = ({
  id,
  udr,
}) => {
  const dispatch = useAppDispatch();

  const itemClass = lookupScalarItemClass(udr.class);

  return (
    <ItemEditor
      title={udr.friendlyName ? udr.friendlyName! : id}
      backgroundColor={{ light: Colors.SEPIA5, dark: Colors.SEPIA1 }}
    >
      <div className="scalar-item-collapse-body">
        {itemClass
          ? getScalarItemPropsTable(id, udr, itemClass!, dispatch)
          : getClassNotFoundMessage(udr.class)}
      </div>
    </ItemEditor>
  );
};

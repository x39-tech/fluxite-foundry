import { Callout } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import produce from "immer";
import { createSelector } from "@reduxjs/toolkit";
import { useAppDispatch, useCurrentEditorSelector } from "app/hooks";
import { AppDispatch } from "app/store";
import {
  Parameter,
  Access,
  Lifetime,
  DataType,
} from "generated/draft-2023-1/udr-document";
import { DeviceClassEditorState } from "features/deviceClassEditor/deviceClassEditorState";
import { getAccessFriendlyName, getLifetimeFriendlyName } from "udr/util/enums";
import {
  ClearableNumericInputTableRow,
  NumericInputTableRow,
} from "utils/components/EditorFields/NumericInputField";
import { SelectTableRow } from "utils/components/EditorFields/SelectField";
import {
  OptionalTextEditorTableRow,
  TextEditorTableRow,
} from "utils/components/EditorFields/TextEditorField";
import { ItemEditor } from "utils/components/ItemEditor/ItemEditor";
import { ParameterClassDisplay } from "utils/components/ParameterClassDisplay/ParameterClassDisplay";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { DispatchOnChangeFactory } from "utils/dispatchOnChangeFactory";
import {
  validateNewItemId,
  validateStringIsNumberAndBetweenMinAndMaxOrEmpty,
  validateStringIsNumberOrEmpty,
} from "utils/inputValidation";
import {
  ParameterClassWithId,
  UdrDatabase,
  lookupParameterClass,
} from "udr/udrDatabase";
import {
  parameterDeleted,
  parameterUpdated,
  parameterIdUpdated,
} from "./parametersEditorSlice";
import "./ParameterEditor.css";

interface Props {
  id: string;
  udr: Parameter;
  database: UdrDatabase;
}

export const ParameterEditor = ({ id, udr, database }: Props) => {
  const dispatch = useAppDispatch();

  const itemClass = lookupParameterClass(database, udr.class);

  const parameterIds = useCurrentEditorSelector(
    createSelector(
      (state: DeviceClassEditorState) => state.parameters.parameters,
      (parameters) => Object.keys(parameters),
    ),
  );

  return (
    <ItemEditor
      title={udr["@friendlyName"] ? udr["@friendlyName"]! : id}
      onDelete={() => {
        dispatch(parameterDeleted(id));
      }}
    >
      <div className="parameter-collapse-body">
        {itemClass
          ? getParameterPropsTable(
              id,
              udr,
              itemClass!,
              parameterIds,
              dispatch,
              database,
            )
          : getClassNotFoundMessage(udr.class)}
      </div>
    </ItemEditor>
  );
};

enum ParameterInstantiationType {
  SINGLE = "Single",
  MULTIPLE = "Multiple",
  DYNAMIC = "Dynamic",
}

function getInstantiationProperties(
  udr: Parameter,
  onChangeFactory: DispatchOnChangeFactory<Parameter>,
): JSX.Element {
  return (
    <>
      <SelectTableRow
        label="Instances"
        values={Object.values(ParameterInstantiationType)}
        selectedValue={
          udr.dynamicMinimum
            ? ParameterInstantiationType.DYNAMIC
            : udr.count
            ? ParameterInstantiationType.MULTIPLE
            : ParameterInstantiationType.SINGLE
        }
        onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
          switch (newValue as ParameterInstantiationType) {
            case ParameterInstantiationType.SINGLE:
              delete draft.dynamicMinimum;
              delete draft.dynamicMaximum;
              delete draft.count;
              break;
            case ParameterInstantiationType.MULTIPLE:
              delete draft.dynamicMinimum;
              delete draft.dynamicMaximum;
              draft.count = 1;
              break;
            case ParameterInstantiationType.DYNAMIC:
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
  udr: Parameter,
  onChangeFactory: DispatchOnChangeFactory<Parameter>,
): JSX.Element {
  return (
    <>
      <OptionalTextEditorTableRow
        label="Minimum Value"
        defaultValue={udr.minimum !== undefined ? `${udr.minimum}` : ""}
        onValueChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.minimum = parseIfNotUndefined(newValue);
        })}
        validator={validateStringIsNumberOrEmpty}
      />
      <OptionalTextEditorTableRow
        label="Maximum Value"
        defaultValue={udr.maximum !== undefined ? `${udr.maximum}` : undefined}
        onValueChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.maximum = parseIfNotUndefined(newValue);
        })}
        validator={validateStringIsNumberOrEmpty}
      />
      <OptionalTextEditorTableRow
        label="Default Value"
        defaultValue={udr.default !== undefined ? `${udr.default}` : undefined}
        onValueChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.default = parseIfNotUndefined(newValue);
        })}
        validator={(input) =>
          validateStringIsNumberAndBetweenMinAndMaxOrEmpty(
            input,
            udr.minimum,
            udr.maximum,
          )
        }
      />
    </>
  );
}

function getParameterPropsTable(
  id: string,
  udr: Parameter,
  itemClass: ParameterClassWithId,
  existingItemIds: string[],
  dispatch: AppDispatch,
  database: UdrDatabase,
): JSX.Element {
  const onChangeFactory = new DispatchOnChangeFactory(
    udr,
    (newValue, changeRecipe) => {
      dispatch(
        parameterUpdated({
          id,
          newValue: produce(udr, (draft) => changeRecipe(draft, newValue)),
        }),
      );
    },
  );

  const accessValues =
    udr.lifetime === Lifetime.STATIC
      ? Object.values(Access).filter((value) => value !== Access.READWRITE)
      : Object.values(Access);

  return (
    <SimplePropsTable>
      <tr>
        <td>Class</td>
        <td>
          <Popover2
            content={
              <ParameterClassDisplay udr={itemClass} database={database} />
            }
            position="right"
            interactionKind="hover"
          >
            <pre>{udr.class}</pre>
          </Popover2>
        </td>
      </tr>
      <TextEditorTableRow
        label="ID"
        defaultValue={id}
        onValueChanged={(newValue) => {
          dispatch(parameterIdUpdated({ id, newId: newValue }));
        }}
        validator={(input) =>
          validateNewItemId(
            input,
            existingItemIds.filter((value) => value !== id),
          )
        }
      />
      <TextEditorTableRow
        label="Display Name"
        defaultValue={udr["@friendlyName"]}
        onValueChanged={onChangeFactory.getFn((draft, newValue) => {
          draft["@friendlyName"] = newValue;
        })}
      />
      <SelectTableRow
        label="Access"
        values={accessValues}
        displayValues={accessValues.map(getAccessFriendlyName)}
        selectedValue={udr.access}
        onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
          draft.access = newValue as Access;
        })}
      />
      <SelectTableRow
        label="Lifetime"
        values={Object.values(Lifetime)}
        displayValues={Object.values(Lifetime).map(getLifetimeFriendlyName)}
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
        getMinMaxDefaultProperties(udr, onChangeFactory)
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

function parseIfNotUndefined(value?: string): number | undefined {
  return value === undefined ? value : parseFloat(value);
}

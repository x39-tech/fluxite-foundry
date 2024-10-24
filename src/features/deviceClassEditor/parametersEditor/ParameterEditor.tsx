import { Callout } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { Draft } from "immer";
import { Parameter, Lifetime, DataType, ParameterAccess } from "e173";
import {
  getParamAccessFriendlyName,
  getLifetimeFriendlyName,
} from "udr/util/enums";
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
import { ParameterClassDisplay } from "utils/components/ParameterClassDisplay";
import { SimplePropsTable } from "utils/components/SimplePropsTable";
import {
  validateNewItemId,
  validateStringIsNumberAndBetweenMinAndMaxOrEmpty,
  validateStringIsNumberOrEmpty,
} from "utils/inputValidation";
import { ParameterClassWithId, lookupParameterClass } from "udr/udrDatabase";
import {
  changeParameterId,
  deleteParameter,
  modifyParameter,
  useParameter,
  useParameterIds,
} from "./state";
import { useUdrDatabase } from "app/state";
import { useLibraries } from "../state";
import { RenderError } from "utils/components/RenderError";
import "./ParameterEditor.css";

interface Props {
  id: string;
}

type ParameterModifier = (fn: (draft: Draft<Parameter>) => void) => void;

export const ParameterEditor = ({ id }: Props) => {
  const database = useUdrDatabase();
  const parameterIds = useParameterIds();
  const param = useParameter(id);
  if (!param) {
    return <RenderError />;
  }

  const libraries = useLibraries();
  if (!libraries) {
    return <RenderError />;
  }

  // TODO handle device library
  const libraryVersion = libraries[param.library!];
  if (!libraryVersion) {
    return <RenderError />;
  }

  const paramClass = lookupParameterClass(
    database,
    param.library!,
    libraryVersion,
    param.class,
  );

  return (
    <ItemEditor
      title={param["@friendlyName"] ? param["@friendlyName"]! : id}
      onDelete={() => deleteParameter(id)}
    >
      <div className="parameter-collapse-body">
        {paramClass
          ? getParameterPropsTable(
              id,
              param,
              (recipe) => modifyParameter(id, recipe),
              paramClass!,
              parameterIds,
            )
          : getClassNotFoundMessage(param.class)}
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
  modifyParam: ParameterModifier,
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
        onSelectionChanged={(newValue) =>
          modifyParam((draft) =>
            changeInstantiationType(
              draft,
              newValue as ParameterInstantiationType,
            ),
          )
        }
      />
      {udr.count ? (
        <NumericInputTableRow
          label="Instance Count"
          value={udr.count || ""}
          min={1}
          minorStepSize={null}
          onValueChange={(newValue) =>
            modifyParam((draft) => {
              draft.count = newValue;
            })
          }
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
            onValueChange={(newValue) =>
              modifyParam((draft) => {
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
          <ClearableNumericInputTableRow
            label="Maximum Instance Count"
            value={udr.dynamicMaximum || ""}
            placeholder="(no maximum)"
            min={1}
            minorStepSize={null}
            onValueChange={(newValue) =>
              modifyParam((draft) => {
                draft.dynamicMaximum = newValue;
                if (
                  newValue !== undefined &&
                  draft.dynamicMinimum! > newValue
                ) {
                  draft.dynamicMinimum = newValue;
                }
              })
            }
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
  modifyParam: ParameterModifier,
): JSX.Element {
  return (
    <>
      <OptionalTextEditorTableRow
        label="Minimum Value"
        defaultValue={udr.minimum !== undefined ? `${udr.minimum}` : ""}
        onValueChanged={(newValue) =>
          modifyParam((draft) => {
            draft.minimum = parseIfNotUndefined(newValue);
          })
        }
        validator={validateStringIsNumberOrEmpty}
      />
      <OptionalTextEditorTableRow
        label="Maximum Value"
        defaultValue={udr.maximum !== undefined ? `${udr.maximum}` : undefined}
        onValueChanged={(newValue) =>
          modifyParam((draft) => {
            draft.maximum = parseIfNotUndefined(newValue);
          })
        }
        validator={validateStringIsNumberOrEmpty}
      />
      <OptionalTextEditorTableRow
        label="Default Value"
        defaultValue={udr.default !== undefined ? `${udr.default}` : undefined}
        onValueChanged={(newValue) =>
          modifyParam((draft) => {
            draft.default = parseIfNotUndefined(newValue);
          })
        }
        validator={(input) =>
          validateStringIsNumberAndBetweenMinAndMaxOrEmpty(
            input,
            // TODO: Fix to handle booleans
            udr.minimum as number | undefined,
            udr.maximum as number | undefined,
          )
        }
      />
    </>
  );
}

function getParameterPropsTable(
  id: string,
  param: Parameter,
  modifyParam: ParameterModifier,
  paramClass: ParameterClassWithId,
  existingItemIds: string[],
): JSX.Element {
  return (
    <SimplePropsTable>
      <tr>
        <td>Library</td>
        <td>
          <pre>{param.library || "Device Library"}</pre>
        </td>
      </tr>
      <tr>
        <td>Class</td>
        <td>
          <Popover2
            content={<ParameterClassDisplay paramClass={paramClass} />}
            position="right"
            interactionKind="hover"
          >
            <pre>{param.class}</pre>
          </Popover2>
        </td>
      </tr>
      <TextEditorTableRow
        label="ID"
        defaultValue={id}
        onValueChanged={(newValue) => changeParameterId(id, newValue)}
        validator={(input) =>
          validateNewItemId(
            input,
            existingItemIds.filter((value) => value !== id),
          )
        }
      />
      <TextEditorTableRow
        label="Display Name"
        defaultValue={param["@friendlyName"]}
        onValueChanged={(newValue) =>
          modifyParam((draft) => (draft["@friendlyName"] = newValue))
        }
      />
      <tr>
        <td>Access</td>
        <td className="flex flex-row items-center">
          {getAccessCheckbox(
            id,
            ParameterAccess.ReadActual,
            param.access,
            modifyParam,
            false,
          )}
          {getAccessCheckbox(
            id,
            ParameterAccess.ReadTarget,
            param.access,
            modifyParam,
            param.lifetime === Lifetime.Static,
          )}
          {getAccessCheckbox(
            id,
            ParameterAccess.Write,
            param.access,
            modifyParam,
            param.lifetime === Lifetime.Static,
          )}
        </td>
      </tr>
      <SelectTableRow
        label="Lifetime"
        values={Object.values(Lifetime)}
        displayValues={Object.values(Lifetime).map(getLifetimeFriendlyName)}
        selectedValue={param.lifetime}
        onSelectionChanged={(newValue) =>
          modifyParam((draft) => {
            draft.lifetime = newValue as Lifetime;
            if (newValue === Lifetime.Static) {
              draft.access = draft.access.filter(
                (value) => value === ParameterAccess.ReadActual,
              );
            }
          })
        }
      />
      {getInstantiationProperties(param, modifyParam)}
      {paramClass.dataType === DataType.Number ? (
        getMinMaxDefaultProperties(param, modifyParam)
      ) : (
        <></>
      )}
    </SimplePropsTable>
  );
}

function getAccessCheckbox(
  paramId: string,
  access: ParameterAccess,
  paramAccess: ParameterAccess[],
  modifyParam: ParameterModifier,
  disabled: boolean,
): JSX.Element {
  const id = `paramEditor-${paramId}-access${access}`;

  return (
    <>
      <input
        type="checkbox"
        id={id}
        checked={paramAccess.includes(access)}
        disabled={disabled}
        onChange={(event) =>
          modifyParam((draft) => {
            if (event.target.value && !draft.access.includes(access)) {
              draft.access.push(access);
            } else {
              draft.access = draft.access.filter((value) => value !== access);
            }
          })
        }
      />
      <label className="mx-1" htmlFor={id}>
        {getParamAccessFriendlyName(access)}
      </label>
    </>
  );
}

function changeInstantiationType(
  draft: Draft<Parameter>,
  newType: ParameterInstantiationType,
) {
  switch (newType) {
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

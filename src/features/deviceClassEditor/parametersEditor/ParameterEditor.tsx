import { JSX } from "react";
import { Draft } from "immer";
import { Parameter, Lifetime, DataType, ParameterAccess } from "e173";
import { ExclamationTriangleIcon } from "@heroicons/react/16/solid";
import {
  getParamAccessFriendlyName,
  getLifetimeFriendlyName,
} from "udr/util/enums";
import { IntegerInputTableRow } from "components/EditorFields/IntegerInputField";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { SelectTableRow } from "components/EditorFields/DeprecatedSelectField";
import {
  OptionalTextEditorTableRow,
  TextEditorTableRow,
} from "components/EditorFields/DeprecatedTextEditorField";
import { ItemEditor } from "components/ItemEditor/ItemEditor";
import { SimplePropsTable } from "components/SimplePropsTable";
import { RenderError } from "components/RenderError";
import { Alert, AlertDescription, AlertTitle } from "components/scn-ui/Alert";
import { ParameterClassDisplay } from "./ParameterClassDisplay";
import {
  validateNewItemId,
  validateStringIsNumberAndBetweenMinAndMaxOrEmpty,
  validateStringIsNumberOrEmpty,
} from "utils/inputValidation";
import {
  ResolvedParameterClass,
  lookupDeviceParameterClass,
  lookupParameterClass,
} from "udr/udrDatabase";
import { useUdrDatabase } from "app/store";
import {
  changeParameterId,
  deleteParameter,
  modifyParameter,
  useParameter,
  useParameterIds,
} from "./state";
import {
  useDeviceLibrary,
  useDeviceLocalizations,
  useLibraries,
} from "../state";

interface Props {
  id: string;
}

type ParameterModifier = (fn: (draft: Draft<Parameter>) => void) => void;

export const ParameterEditor = ({ id }: Props) => {
  const database = useUdrDatabase();
  const parameterIds = useParameterIds();
  const param = useParameter(id);
  const libraries = useLibraries();
  const deviceLibrary = useDeviceLibrary();
  const deviceLocalizations = useDeviceLocalizations();

  if (!param) {
    return <RenderError />;
  }

  let paramClass: ResolvedParameterClass | undefined = undefined;
  if (param.library) {
    const libraryVersion = libraries?.[param.library];
    if (!libraryVersion) {
      return <RenderError />;
    }

    paramClass = lookupParameterClass(
      database,
      param.library,
      libraryVersion,
      param.class,
    );
  } else {
    paramClass = lookupDeviceParameterClass(
      deviceLibrary,
      deviceLocalizations,
      param.class,
    );
  }

  return (
    <ItemEditor
      title={param["@friendlyName"] ? param["@friendlyName"]! : id}
      onDelete={() => deleteParameter(id)}
    >
      <div className="flex flex-col">
        {paramClass
          ? getParameterPropsTable(
              id,
              param,
              (recipe) => modifyParameter(id, recipe),
              paramClass,
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
        <IntegerInputTableRow
          label="Instance Count"
          value={udr.count ?? null}
          min={1}
          onValueChange={(newValue) =>
            newValue &&
            modifyParam((draft) => {
              draft.count = newValue || undefined;
            })
          }
        />
      ) : (
        <></>
      )}
      {udr.dynamicMinimum ? (
        <>
          <IntegerInputTableRow
            label="Minimum Instance Count"
            value={udr.dynamicMinimum ?? null}
            min={1}
            onValueChange={(newValue) =>
              newValue &&
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
          <IntegerInputTableRow
            clearable
            label="Maximum Instance Count"
            value={udr.dynamicMaximum ?? null}
            placeholder="(no maximum)"
            min={1}
            onValueChange={(newValue) => {
              modifyParam((draft) => {
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
}

function getMinMaxDefaultProperties(
  udr: Parameter,
  modifyParam: ParameterModifier,
): JSX.Element {
  return (
    <>
      <OptionalTextEditorTableRow
        label="Minimum Value"
        value={udr.minimum !== undefined ? `${udr.minimum}` : ""}
        onValueChanged={(newValue) =>
          modifyParam((draft) => {
            draft.minimum = parseIfNotUndefined(newValue);
          })
        }
        validator={validateStringIsNumberOrEmpty}
      />
      <OptionalTextEditorTableRow
        label="Maximum Value"
        value={udr.maximum !== undefined ? `${udr.maximum}` : undefined}
        onValueChanged={(newValue) =>
          modifyParam((draft) => {
            draft.maximum = parseIfNotUndefined(newValue);
          })
        }
        validator={validateStringIsNumberOrEmpty}
      />
      <OptionalTextEditorTableRow
        label="Default Value"
        value={udr.default !== undefined ? `${udr.default}` : undefined}
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
  paramClass: ResolvedParameterClass,
  existingItemIds: string[],
): JSX.Element {
  return (
    <SimplePropsTable className="mb-2">
      <tr>
        <td>Library</td>
        <td>
          <code>{param.library || "Device Library"}</code>
        </td>
      </tr>
      <tr>
        <td>Class</td>
        <td>
          <Tooltip>
            <TooltipTrigger>
              <code>{param.class}</code>
            </TooltipTrigger>
            <TooltipContent side="right">
              <ParameterClassDisplay paramClass={paramClass} />
            </TooltipContent>
          </Tooltip>
        </td>
      </tr>
      <TextEditorTableRow
        label="ID"
        value={id}
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
        value={param["@friendlyName"]}
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
    <Alert>
      <ExclamationTriangleIcon />
      <AlertTitle>
        <span>
          Class <code>{className}</code> not found.
        </span>
      </AlertTitle>
      <AlertDescription>
        This may be an indication of invalid UDR.
      </AlertDescription>
    </Alert>
  );
}

function parseIfNotUndefined(value?: string): number | undefined {
  return value === undefined ? value : parseFloat(value);
}

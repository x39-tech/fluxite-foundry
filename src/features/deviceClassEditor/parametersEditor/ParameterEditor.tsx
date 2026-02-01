import { useId } from "react";
import { capitalCase } from "change-case";
import { ExclamationTriangleIcon } from "@heroicons/react/16/solid";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { SelectTableRow } from "components/EditorFields/DeprecatedSelectField";
import { TextEditorTableRow } from "components/EditorFields/DeprecatedTextEditorField";
import { ItemEditor } from "components/ItemEditor/ItemEditor";
import { SimplePropsTable } from "components/SimplePropsTable";
import { RenderError } from "components/RenderError";
import { Alert, AlertDescription, AlertTitle } from "components/scn-ui/Alert";
import { ParameterClassDisplay } from "./ParameterClassDisplay";
import { validateNewItemId } from "utils/inputValidation";
import {
  deleteParameter,
  LocalizedParameter,
  modifyParameter,
  modifyParameterLocalizedValue,
  useParameterCodexIds,
  useParameterInfo,
} from "./state";
import { EnumChoicesEditor } from "components/EnumChoicesEditor";
import { InstantiationProperties } from "./InstantiationProperties";
import {
  LocalizedInstanceEnumChoice,
  ResolvedParameterClass,
} from "../stateTransformations";
import {
  ParameterAccess,
  Lifetime,
  lifetimes,
  fcDataTypes,
  EntityId,
  CodexId,
} from "app/persistentState";
import { useCurrentLocale } from "app/store";
import { MinMaxDefaultProperties } from "./MinMaxDefaultProperties";

interface Props {
  paramId: EntityId;
}

export const ParameterEditor = ({ paramId }: Props) => {
  const paramInfo = useParameterInfo(paramId);
  const parameterIds = useParameterCodexIds();

  if (!paramInfo) {
    return <RenderError />;
  }

  const { param, paramClass, instanceEnumChoices } = paramInfo;

  return (
    <ItemEditor title={param.codexId} onDelete={() => deleteParameter(paramId)}>
      <div className="flex flex-col">
        {paramClass ? (
          <ParameterPropsTable
            paramId={paramId}
            param={param}
            paramClass={paramClass}
            instanceEnumChoices={instanceEnumChoices}
            existingItemIds={parameterIds}
          />
        ) : (
          <ClassNotFoundMessage paramClass={param.class.codexId} />
        )}
      </div>
    </ItemEditor>
  );
};

interface ParameterPropsTableProps {
  paramId: EntityId;
  param: LocalizedParameter;
  paramClass: ResolvedParameterClass;
  instanceEnumChoices: LocalizedInstanceEnumChoice[];
  existingItemIds: string[];
}

const ParameterPropsTable = ({
  paramId,
  param,
  paramClass,
  instanceEnumChoices,
  existingItemIds,
}: ParameterPropsTableProps) => {
  const locale = useCurrentLocale();

  return (
    <SimplePropsTable className="mb-2">
      <tr>
        <td>Library</td>
        <td>
          <code>
            {param.class.type === "imported"
              ? param.class.library
              : "Device Library"}
          </code>
        </td>
      </tr>
      <tr>
        <td>Class</td>
        <td>
          <Tooltip>
            <TooltipTrigger>
              <code>{param.class.codexId}</code>
            </TooltipTrigger>
            <TooltipContent side="right">
              <ParameterClassDisplay paramClass={paramClass} />
            </TooltipContent>
          </Tooltip>
        </td>
      </tr>
      <TextEditorTableRow
        label="ID"
        value={param.codexId}
        onValueChanged={(newValue) =>
          modifyParameter(
            paramId,
            (draft) => (draft.codexId = CodexId(newValue)),
          )
        }
        validator={(input) =>
          validateNewItemId(
            input,
            existingItemIds.filter((value) => value !== param.codexId),
          )
        }
      />
      <TextEditorTableRow
        label="Display Name"
        value={param.friendlyName?.value}
        onValueChanged={(newValue) =>
          modifyParameterLocalizedValue(
            paramId,
            "friendlyName",
            newValue,
            locale,
          )
        }
      />
      <tr>
        <td>Access</td>
        <td className="flex flex-row items-center">
          <AccessCheckbox
            paramId={paramId}
            access="readActual"
            paramAccess={param.access}
            disabled={false}
          />
          <AccessCheckbox
            paramId={paramId}
            access="readTarget"
            paramAccess={param.access}
            disabled={param.lifetime === "static"}
          />
          <AccessCheckbox
            paramId={paramId}
            access="write"
            paramAccess={param.access}
            disabled={param.lifetime === "static"}
          />
        </td>
      </tr>
      <SelectTableRow
        label="Lifetime"
        values={Object.values(lifetimes)}
        displayValues={Object.values(lifetimes).map((val) => capitalCase(val))}
        selectedValue={param.lifetime}
        onSelectionChanged={(newValue) =>
          modifyParameter(paramId, (draft) => {
            draft.lifetime = newValue as Lifetime;
            if (newValue === "static") {
              draft.access = draft.access.filter(
                (value) => value === "readActual",
              );
            }
          })
        }
      />
      <InstantiationProperties paramId={paramId} param={param} />
      {paramClass.dataType === fcDataTypes.NUMBER && (
        <MinMaxDefaultProperties paramId={paramId} param={param} />
      )}
      {paramClass.dataType === fcDataTypes.ENUM && (
        <tr>
          <td className="align-middle">Enum Choices</td>
          <td>
            <EnumChoicesEditor
              forName={param.friendlyName?.value || param.codexId}
              parent={{ type: "paramAdditional", id: paramId }}
              classChoices={paramClass.choices}
              instanceChoices={instanceEnumChoices}
              exclusions={param.enumExclusions}
              onExclusionChanged={(choiceId, excluded) =>
                modifyParameter(paramId, (draft) => {
                  draft.enumExclusions ||= [];

                  if (excluded) {
                    if (!draft.enumExclusions.includes(choiceId)) {
                      draft.enumExclusions.push(choiceId);
                    }
                  } else {
                    draft.enumExclusions = draft.enumExclusions.filter(
                      (value) => value !== choiceId,
                    );
                    if (!draft.enumExclusions) {
                      delete draft.enumExclusions;
                    }
                  }
                })
              }
            />
          </td>
        </tr>
      )}
    </SimplePropsTable>
  );
};

interface AccessCheckboxProps {
  paramId: EntityId;
  access: ParameterAccess;
  paramAccess: ParameterAccess[];
  disabled: boolean;
}

const AccessCheckbox = ({
  paramId,
  access,
  paramAccess,
  disabled,
}: AccessCheckboxProps) => {
  const id = useId();

  return (
    <>
      <input
        type="checkbox"
        id={id}
        checked={paramAccess.includes(access)}
        disabled={disabled}
        onChange={(event) =>
          modifyParameter(paramId, (draft) => {
            if (event.target.value && !draft.access.includes(access)) {
              draft.access.push(access);
            } else {
              draft.access = draft.access.filter((value) => value !== access);
            }
          })
        }
      />
      <label className="mx-1" htmlFor={id}>
        {capitalCase(access)}
      </label>
    </>
  );
};

interface ClassNotFoundMessageProps {
  paramClass: CodexId;
}

const ClassNotFoundMessage = ({ paramClass }: ClassNotFoundMessageProps) => {
  return (
    <Alert>
      <ExclamationTriangleIcon />
      <AlertTitle>
        <span>
          Class <code>{paramClass}</code> not found.
        </span>
      </AlertTitle>
      <AlertDescription>
        This may be an indication of invalid Fluxite Codex.
      </AlertDescription>
    </Alert>
  );
};

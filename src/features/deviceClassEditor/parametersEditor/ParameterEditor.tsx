import { useId } from "react";
import { capitalCase } from "change-case";
import { ExclamationTriangleIcon } from "@heroicons/react/16/solid";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { AppInput } from "components/AppInput";
import { RenderError } from "components/RenderError";
import { ItemClassDisplay } from "components/ItemClassDisplay";
import { ParameterClassDisplay } from "./ParameterClassDisplay";
import { EnumChoicesEditor } from "components/EnumChoicesEditor";
import { ValidatedInput } from "components/ValidatedInput";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { SelectField } from "components/EditorFields/SelectField";
import { Alert, AlertDescription, AlertTitle } from "components/scn-ui/Alert";
import { validateNewItemId } from "utils/inputValidation";
import { useCurrentLocale } from "app/store";
import {
  CodexId,
  EntityId,
  Lifetime,
  lifetimes,
  fcDataTypes,
  ParameterAccess,
  parameterAccesses,
} from "app/persistentState";
import {
  modifyParameter,
  modifyParameterLocalizedValue,
  useParameterCodexIds,
  useParameterInfo,
} from "./state";
import { InstantiationProperties } from "./InstantiationProperties";
import { MinMaxDefaultProperties } from "./MinMaxDefaultProperties";

interface Props {
  id: EntityId;
}

export const ParameterEditor = ({ id }: Props) => {
  const parameterCodexIds = useParameterCodexIds();
  const paramInfo = useParameterInfo(id);
  const locale = useCurrentLocale();

  const idPrefix = useId();

  if (!paramInfo) {
    return <RenderError />;
  }

  const { param, paramClass, instanceEnumChoices } = paramInfo;

  if (!paramClass) {
    return (
      <Alert>
        <ExclamationTriangleIcon />
        <AlertTitle>
          <span>
            Class <code>{param.class.codexId}</code> not found.
          </span>
        </AlertTitle>
        <AlertDescription>
          This may be an indication of invalid Fluxite Codex.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-library`}>Library</Label>
          <AppInput
            id={`${idPrefix}-library`}
            disabled
            value={
              param.class.type === "imported"
                ? param.class.library
                : "Device Library"
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-class`}>Class</Label>
          <ItemClassDisplay
            id={`${idPrefix}-class`}
            value={param.class.codexId}
            tooltipRenderer={() => (
              <ParameterClassDisplay paramClass={paramClass} />
            )}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>ID</Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={param.codexId}
            onConfirm={(newValue) =>
              modifyParameter(
                id,
                (draft) => (draft.codexId = CodexId(newValue)),
              )
            }
            validator={(input) =>
              validateNewItemId(
                input,
                parameterCodexIds.filter((value) => value !== param.codexId),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-friendlyName`}>Display Name</Label>
          <ValidatedInput
            id={`${idPrefix}-friendlyName`}
            value={param.friendlyName?.value || ""}
            onConfirm={(newValue) =>
              modifyParameterLocalizedValue(
                id,
                "friendlyName",
                newValue,
                locale,
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-access`}>Access</Label>
          <AccessCheckboxes
            id={`${idPrefix}-access`}
            access={param.access}
            lifetime={param.lifetime}
            onAccessChanged={(newAccess) =>
              modifyParameter(id, (draft) => {
                draft.access = newAccess;
              })
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-lifetime`}>Lifetime</Label>
          <SelectField
            id={`${idPrefix}-lifetime`}
            values={Object.values(lifetimes)}
            displayValues={Object.values(lifetimes).map((val) =>
              capitalCase(val),
            )}
            selectedValue={param.lifetime}
            onSelectionChanged={(newValue) =>
              modifyParameter(id, (draft) => {
                draft.lifetime = newValue as Lifetime;
                if (newValue === lifetimes.STATIC) {
                  draft.access = draft.access.filter(
                    (value) => value === parameterAccesses.READ_ACTUAL,
                  );
                }
              })
            }
          />
        </FieldSet>
        <InstantiationProperties paramId={id} param={param} />
        {paramClass.dataType === fcDataTypes.NUMBER && (
          <MinMaxDefaultProperties paramId={id} param={param} />
        )}
      </div>
      {paramClass.dataType === fcDataTypes.ENUM && (
        <FieldSet>
          <Label htmlFor={`${idPrefix}-enumChoices`}>Enum Choices</Label>
          <EnumChoicesEditor
            id={`${idPrefix}-enumChoices`}
            forName={param.friendlyName?.value || param.codexId}
            parent={{ type: "paramAdditional", id }}
            classChoices={paramClass.choices}
            instanceChoices={instanceEnumChoices}
            exclusions={param.enumExclusions}
            onExclusionChanged={(choiceId, excluded) =>
              modifyParameter(id, (draft) => {
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
        </FieldSet>
      )}
    </div>
  );
};

interface AccessCheckboxesProps {
  id: string;
  access: ParameterAccess[];
  lifetime: Lifetime;
  onAccessChanged: (access: ParameterAccess[]) => void;
}

const AccessCheckboxes = ({
  id,
  access,
  lifetime,
  onAccessChanged,
}: AccessCheckboxesProps) => {
  const updateAccess = (checked: boolean, relevantAccess: ParameterAccess) => {
    if (checked && !access.includes(relevantAccess)) {
      onAccessChanged([...access, relevantAccess]);
    } else if (!checked) {
      onAccessChanged(access.filter((a) => a !== relevantAccess));
    }
  };

  return (
    <div id={id} className="flex w-xs h-9 items-center gap-4 px-1">
      <LabeledCheckbox
        checked={access.includes(parameterAccesses.READ_ACTUAL)}
        onChange={(checked) =>
          updateAccess(checked, parameterAccesses.READ_ACTUAL)
        }
      >
        Read Actual
      </LabeledCheckbox>
      <LabeledCheckbox
        disabled={lifetime === lifetimes.STATIC}
        checked={access.includes(parameterAccesses.READ_TARGET)}
        onChange={(checked) =>
          updateAccess(checked, parameterAccesses.READ_TARGET)
        }
      >
        Read Target
      </LabeledCheckbox>
      <LabeledCheckbox
        disabled={lifetime === lifetimes.STATIC}
        checked={access.includes(parameterAccesses.WRITE)}
        onChange={(checked) => updateAccess(checked, parameterAccesses.WRITE)}
      >
        Write
      </LabeledCheckbox>
    </div>
  );
};

import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { useId } from "react";
import { capitalCase } from "change-case";
import { TriangleAlertIcon } from "lucide-react";
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
import { useAuthoringLocale } from "app/store";
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

const DEVICE_LIBRARY = msg({
  id: "deviceClassEditor.paramEditor.deviceLibrary",
  message: "Device Library",
});

interface Props {
  id: EntityId;
}

export const ParameterEditor = ({ id }: Props) => {
  const { _ } = useLingui();

  const parameterCodexIds = useParameterCodexIds();
  const paramInfo = useParameterInfo(id);
  const locale = useAuthoringLocale();

  const idPrefix = useId();

  if (!paramInfo) {
    return <RenderError />;
  }

  const { param, paramClass, instanceEnumChoices } = paramInfo;

  if (!paramClass) {
    const codexId =
      param.class.type === "imported" ? param.class.codexId : undefined;

    return (
      <Alert>
        <TriangleAlertIcon />
        <AlertTitle>
          <span>
            {codexId !== undefined ? (
              <Trans id="deviceClassEditor.paramEditor.importedClassNotFound">
                Class <code>{codexId}</code> not found.
              </Trans>
            ) : (
              <Trans id="deviceClassEditor.paramEditor.referencedClassNotFound">
                Referenced class not found. It may have been deleted.
              </Trans>
            )}
          </span>
        </AlertTitle>
        <AlertDescription>
          <Trans id="deviceClassEditor.paramEditor.referencedClassNotFoundDesc">
            This may be an indication of invalid Fluxite Codex.
          </Trans>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-library`}>
            <Trans id="deviceClassEditor.paramEditor.library">Library</Trans>
          </Label>
          <AppInput
            id={`${idPrefix}-library`}
            disabled
            value={
              param.class.type === "imported"
                ? param.class.library
                : _(DEVICE_LIBRARY)
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-class`}>
            <Trans id="deviceClassEditor.paramEditor.class">Class</Trans>
          </Label>
          <ItemClassDisplay
            id={`${idPrefix}-class`}
            value={paramClass.codexId}
            tooltipRenderer={() => (
              <ParameterClassDisplay paramClass={paramClass} />
            )}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>
            <Trans id="deviceClassEditor.paramEditor.id">ID</Trans>
          </Label>
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
          <Label htmlFor={`${idPrefix}-friendlyName`}>
            <Trans id="deviceClassEditor.paramEditor.displayName">
              Display Name
            </Trans>
          </Label>
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
          <Label htmlFor={`${idPrefix}-access`}>
            <Trans id="deviceClassEditor.paramEditor.access">Access</Trans>
          </Label>
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
          <Label htmlFor={`${idPrefix}-lifetime`}>
            <Trans id="deviceClassEditor.paramEditor.lifetime">Lifetime</Trans>
          </Label>
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
          <Label htmlFor={`${idPrefix}-enumChoices`}>
            <Trans id="deviceClassEditor.paramEditor.enumChoices">
              Enum Choices
            </Trans>
          </Label>
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
        <Trans id="deviceClassEditor.paramEditor.readActual">Read Actual</Trans>
      </LabeledCheckbox>
      <LabeledCheckbox
        disabled={lifetime === lifetimes.STATIC}
        checked={access.includes(parameterAccesses.READ_TARGET)}
        onChange={(checked) =>
          updateAccess(checked, parameterAccesses.READ_TARGET)
        }
      >
        <Trans id="deviceClassEditor.paramEditor.readTarget">Read Target</Trans>
      </LabeledCheckbox>
      <LabeledCheckbox
        disabled={lifetime === lifetimes.STATIC}
        checked={access.includes(parameterAccesses.WRITE)}
        onChange={(checked) => updateAccess(checked, parameterAccesses.WRITE)}
      >
        <Trans id="deviceClassEditor.paramEditor.write">Write</Trans>
      </LabeledCheckbox>
    </div>
  );
};

import { useId } from "react";
import { EntityId, fcDataTypes, FCDataType } from "app/persistentState";
import { RenderError } from "components/RenderError";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { SelectField } from "components/EditorFields/SelectField";
import { UnitField } from "components/EditorFields/UnitField";
import { classKinds } from "./context";
import { ClassIdentityFields } from "./ClassIdentityFields";
import { ClassEnumChoicesEditor } from "./ClassEnumChoicesEditor";
import { useClassOperations, useParameterClassInfo } from "./state";

interface Props {
  id: EntityId;
}

export const ParameterClassEditor = ({ id }: Props) => {
  const parameterClass = useParameterClassInfo(id);
  const operations = useClassOperations();
  const idPrefix = useId();

  if (!parameterClass) {
    return <RenderError />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <ClassIdentityFields
          idPrefix={idPrefix}
          kind={classKinds.PARAMETER}
          id={id}
          codexId={parameterClass.codexId}
          name={parameterClass.name.value}
          description={parameterClass.description?.value}
        />
        <FieldSet>
          <Label htmlFor={`${idPrefix}-dataType`}>Data Type</Label>
          <SelectField
            id={`${idPrefix}-dataType`}
            values={Object.values(fcDataTypes)}
            selectedValue={parameterClass.dataType}
            onSelectionChanged={(newValue) =>
              operations.modifyParameterClass(id, (draft) => {
                draft.dataType = newValue as FCDataType;
              })
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-unit`}>Unit</Label>
          <UnitField
            id={`${idPrefix}-unit`}
            value={parameterClass.unit}
            onValueChanged={(unit) =>
              operations.modifyParameterClass(id, (draft) => {
                if (unit) {
                  draft.unit = unit;
                } else {
                  delete draft.unit;
                }
              })
            }
          />
        </FieldSet>
      </div>
      {parameterClass.dataType === fcDataTypes.ENUM && (
        <FieldSet>
          <Label htmlFor={`${idPrefix}-enumChoices`}>Enum Choices</Label>
          <ClassEnumChoicesEditor
            id={`${idPrefix}-enumChoices`}
            parentType="paramClass"
            parentId={id}
          />
        </FieldSet>
      )}
    </div>
  );
};

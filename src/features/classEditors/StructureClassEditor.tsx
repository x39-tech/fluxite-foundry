import { useId } from "react";
import { EntityId } from "app/persistentState";
import { RenderError } from "components/RenderError";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { classKinds } from "./context";
import { ClassIdentityFields } from "./ClassIdentityFields";
import { useClassOperations, useStructureClassInfo } from "./state";

interface Props {
  id: EntityId;
}

export const StructureClassEditor = ({ id }: Props) => {
  const structureClass = useStructureClassInfo(id);
  const operations = useClassOperations();
  const idPrefix = useId();

  if (!structureClass) {
    return <RenderError />;
  }

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <ClassIdentityFields
        idPrefix={idPrefix}
        kind={classKinds.STRUCTURE}
        id={id}
        codexId={structureClass.codexId}
        name={structureClass.name.value}
        description={structureClass.description?.value}
      />
      <LabeledCheckbox
        className="h-9"
        checked={structureClass.multipleAllowed ?? false}
        onChange={(checked) =>
          operations.modifyStructureClass(id, (draft) => {
            if (checked) {
              draft.multipleAllowed = true;
            } else {
              delete draft.multipleAllowed;
            }
          })
        }
      >
        Multiple Allowed
      </LabeledCheckbox>
    </div>
  );
};

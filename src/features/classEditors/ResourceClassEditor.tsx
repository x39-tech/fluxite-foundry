import { useId } from "react";
import { EntityId } from "app/persistentState";
import { RenderError } from "components/RenderError";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { MediaTypeSelector } from "components/MediaTypeSelector";
import { classKinds } from "./context";
import { ClassIdentityFields } from "./ClassIdentityFields";
import { useClassOperations, useResourceClassInfo } from "./state";

interface Props {
  id: EntityId;
}

export const ResourceClassEditor = ({ id }: Props) => {
  const resourceClass = useResourceClassInfo(id);
  const operations = useClassOperations();
  const idPrefix = useId();

  if (!resourceClass) {
    return <RenderError />;
  }

  return (
    <div className="flex flex-col gap-4">
      <ClassIdentityFields
        idPrefix={idPrefix}
        kind={classKinds.RESOURCE}
        id={id}
        codexId={resourceClass.codexId}
        name={resourceClass.name.value}
        description={resourceClass.description?.value}
      />
      <FieldSet>
        <Label id={`${idPrefix}-mediaTypes`}>Media Types</Label>
        <MediaTypeSelector
          aria-labelledby={`${idPrefix}-mediaTypes`}
          className="w-xs"
          values={resourceClass.mediaType}
          onValuesChange={(mediaTypes) =>
            operations.modifyResourceClass(id, (draft) => {
              draft.mediaType = mediaTypes;
            })
          }
        />
      </FieldSet>
    </div>
  );
};

import { useEffect, useId } from "react";
import { Access, Lifetime } from "e173";
import {
  changeResourceId,
  modifyResource,
  updateResourceAsset,
  useResource,
  useResourceAssetId,
  useResourceClass,
  useResourceIds,
} from "./state";
import { RenderError } from "components/RenderError";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { validateNewItemId } from "utils/inputValidation";
import { AppInput } from "components/AppInput";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { SelectField } from "components/EditorFields/SelectField";
import { ItemClassDisplay } from "components/ItemClassDisplay";
import { getLifetimeFriendlyName } from "udr/util/enums";
import { ResourceClassDisplay } from "./ResourceClassDisplay";
import { AssetId, ResourceDefaultValue } from "./ResourceDefaultValue";

interface Props {
  id: string;
}

export const ResourceEditor = ({ id }: Props) => {
  const resourceIds = useResourceIds();
  const resource = useResource(id);
  const resourceClass = useResourceClass(resource);
  const assetId = useResourceAssetId(resource);

  const libraryId = useId();
  const classId = useId();
  const idId = useId();
  const accessId = useId();
  const lifetimeId = useId();
  const mediaTypeId = useId();
  const defaultValueId = useId();

  // Constrain the value of the resource's mediaType to those permitted by its class, if present
  useEffect(() => {
    if (
      resource &&
      resourceClass?.mediaType &&
      (!resource.mediaType ||
        !resourceClass.mediaType.includes(resource.mediaType))
    ) {
      modifyResource(
        id,
        (resource) => (resource.mediaType = resourceClass.mediaType![0]),
      );
    }
  }, [resourceClass]);

  let defaultValId: AssetId;
  if (assetId) {
    defaultValId = { state: "valid", id: assetId };
  } else if (resource?.default) {
    defaultValId = { state: "missing" };
  } else {
    defaultValId = { state: "none" };
  }

  if (!resource || !resourceClass) {
    // TODO: better user feedback here
    return <RenderError />;
  }

  let mediaType = <></>;
  if (resourceClass.mediaType) {
    mediaType = (
      <FieldSet>
        <Label htmlFor={mediaTypeId}>Media Type</Label>
        <SelectField
          id={mediaTypeId}
          values={resourceClass.mediaType}
          displayValues={resourceClass.mediaType}
          selectedValue={resource.mediaType || resourceClass.mediaType[0]}
          onSelectionChanged={async (newValue) => {
            modifyResource(id, (draft) => {
              draft.mediaType = newValue;
            });
            await updateResourceAsset(id, assetId, undefined);
          }}
        />
      </FieldSet>
    );
  } else {
    // TODO: freeform media type select with suggestions
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={libraryId}>Library</Label>
          <AppInput disabled value={resource.library || "Device Library"} />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={classId}>Class</Label>
          <ItemClassDisplay
            id={classId}
            value={resource.class}
            tooltipRenderer={() => (
              <ResourceClassDisplay resourceClass={resourceClass} />
            )}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={idId}>ID</Label>
          <ValidatedInput
            id={idId}
            value={id}
            onConfirm={(newValue) => changeResourceId(id, newValue)}
            validator={(input) =>
              validateNewItemId(
                input,
                resourceIds.filter((value) => value !== id),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={accessId}>Access</Label>
          <AccessCheckboxes
            id={accessId}
            access={resource.access}
            lifetime={resource.lifetime}
            onAccessChanged={(newAccess) =>
              modifyResource(id, (draft) => {
                draft.access = newAccess;
              })
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={lifetimeId}>Lifetime</Label>
          <SelectField
            id={lifetimeId}
            values={Object.values(Lifetime)}
            displayValues={Object.values(Lifetime).map(getLifetimeFriendlyName)}
            selectedValue={resource.lifetime}
            onSelectionChanged={(newValue) =>
              modifyResource(id, (draft) => {
                draft.lifetime = newValue as Lifetime;
                if (newValue === Lifetime.Static) {
                  draft.access = draft.access.filter(
                    (value) => value === Access.Read,
                  );
                }
              })
            }
          />
        </FieldSet>
        {mediaType}
      </div>
      <FieldSet>
        <Label htmlFor={defaultValueId}>Default Value</Label>
        <ResourceDefaultValue
          id={defaultValueId}
          assetId={defaultValId}
          mediaType={resource.mediaType}
          onChange={async (newAssetId) =>
            await updateResourceAsset(id, assetId, newAssetId)
          }
          onDelete={async () =>
            await updateResourceAsset(id, assetId, undefined)
          }
        />
      </FieldSet>
    </div>
  );
};

interface AccessCheckboxesProps {
  id: string;
  access: Access[];
  lifetime: Lifetime;
  onAccessChanged: (access: Access[]) => void;
}

const AccessCheckboxes = ({
  id,
  access,
  lifetime,
  onAccessChanged,
}: AccessCheckboxesProps) => {
  const updateAccess = (checked: boolean, relevantAccess: Access) => {
    if (checked && !access.includes(relevantAccess)) {
      onAccessChanged([...access, relevantAccess]);
    } else if (!checked) {
      onAccessChanged(access.filter((a) => a !== relevantAccess));
    }
  };

  return (
    <div id={id} className="flex w-xs h-9 items-center gap-4 px-1">
      <LabeledCheckbox
        checked={access.includes(Access.Read)}
        onChange={(checked) => updateAccess(checked, Access.Read)}
      >
        Read
      </LabeledCheckbox>
      <LabeledCheckbox
        disabled={lifetime === Lifetime.Static}
        checked={access.includes(Access.Write)}
        onChange={(checked) => updateAccess(checked, Access.Write)}
      >
        Write
      </LabeledCheckbox>
    </div>
  );
};

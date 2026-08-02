import { useEffect, useId } from "react";
import { capitalCase } from "change-case";
import {
  modifyResource,
  updateResourceAsset,
  useResourceAssetId,
  useResourceCodexIds,
  useResourceInfo,
} from "./state";
import { asOneChange } from "app/store";
import { RenderError } from "components/RenderError";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { validateNewItemId } from "utils/inputValidation";
import { AppInput } from "components/AppInput";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { SelectField } from "components/EditorFields/SelectField";
import { ItemClassDisplay } from "components/ItemClassDisplay";
import { ResourceClassDisplay } from "./ResourceClassDisplay";
import { AssetId, ResourceDefaultValue } from "./ResourceDefaultValue";
import {
  Access,
  accesses,
  CodexId,
  EntityId,
  Lifetime,
  lifetimes,
} from "app/persistentState";

interface Props {
  id: EntityId;
}

export const ResourceEditor = ({ id }: Props) => {
  const resInfo = useResourceInfo(id);
  const resourceCodexIds = useResourceCodexIds();
  const assetId = useResourceAssetId(resInfo?.resource);

  const idPrefix = useId();

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
  }, [resInfo?.resourceClass]);

  if (!resInfo) {
    return <RenderError />;
  }

  const { resource, resourceClass } = resInfo;

  // TODO: Class not found message if class is not found
  if (!resourceClass) {
    return <RenderError />;
  }

  let defaultValId: AssetId;
  if (assetId) {
    defaultValId = { state: "valid", id: assetId };
  } else if (resource?.default) {
    defaultValId = { state: "missing" };
  } else {
    defaultValId = { state: "none" };
  }

  let mediaType = <></>;
  if (resourceClass.mediaType) {
    mediaType = (
      <FieldSet>
        <Label htmlFor={`${idPrefix}-mediaType`}>Media Type</Label>
        <SelectField
          id={`${idPrefix}-mediaType`}
          values={resourceClass.mediaType}
          displayValues={resourceClass.mediaType}
          selectedValue={resource.mediaType || resourceClass.mediaType[0]}
          onSelectionChanged={(newValue) => {
            asOneChange("Change Media Type", () => {
              modifyResource(id, (draft) => {
                draft.mediaType = newValue;
              });
              updateResourceAsset(id);
            });
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
          <Label htmlFor={`${idPrefix}-library`}>Library</Label>
          <AppInput
            id={`${idPrefix}-class`}
            disabled
            value={
              resource.class.type === "imported"
                ? resource.class.library
                : "Device Library"
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-class`}>Class</Label>
          <ItemClassDisplay
            id={`${idPrefix}-class`}
            value={resourceClass.codexId}
            tooltipRenderer={() => (
              <ResourceClassDisplay resourceClass={resourceClass} />
            )}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>ID</Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={resource.codexId}
            onConfirm={(newValue) =>
              modifyResource(id, (draft) => (draft.codexId = CodexId(newValue)))
            }
            validator={(input) =>
              validateNewItemId(
                input,
                resourceCodexIds.filter((value) => value !== resource.codexId),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-access`}>Access</Label>
          <AccessCheckboxes
            id={`${idPrefix}-access`}
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
          <Label htmlFor={`${idPrefix}-lifetime`}>Lifetime</Label>
          <SelectField
            id={`${idPrefix}-lifetime`}
            values={Object.values(lifetimes)}
            displayValues={Object.values(lifetimes).map((val) =>
              capitalCase(val),
            )}
            selectedValue={resource.lifetime}
            onSelectionChanged={(newValue) =>
              modifyResource(id, (draft) => {
                draft.lifetime = newValue as Lifetime;
                if (newValue === lifetimes.STATIC) {
                  draft.access = draft.access.filter(
                    (value) => value === accesses.READ,
                  );
                }
              })
            }
          />
        </FieldSet>
        {mediaType}
      </div>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-defaultValue`}>Default Value</Label>
        <ResourceDefaultValue
          id={`${idPrefix}-defaultValue`}
          assetId={defaultValId}
          mediaType={resource.mediaType}
          onChange={(newAssetId) => updateResourceAsset(id, newAssetId)}
          onDelete={() => updateResourceAsset(id)}
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
        checked={access.includes(accesses.READ)}
        onChange={(checked) => updateAccess(checked, accesses.READ)}
      >
        Read
      </LabeledCheckbox>
      <LabeledCheckbox
        disabled={lifetime === lifetimes.STATIC}
        checked={access.includes(accesses.WRITE)}
        onChange={(checked) => updateAccess(checked, accesses.WRITE)}
      >
        Write
      </LabeledCheckbox>
    </div>
  );
};

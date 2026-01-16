import { useId } from "react";
import builderInfo from "e173/extras/draft-2026-1/_builder.json";
import { RenderError } from "components/RenderError";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { SelectField } from "components/EditorFields/SelectField";
import { TagInput } from "components/TagInput";
import { assignOrDelete } from "utils/utils";
import { useCurrentLocale } from "app/store";
import {
  modifyBasicData,
  modifyBasicDataLocalizedValue,
  useBasicData,
} from "./state";
import {
  modelCategories,
  ModelCategory,
  ModelSubcategory,
} from "app/persistentState";

export const DeviceInfoEditor = () => {
  const basicData = useBasicData();
  const idPrefix = useId();
  const locale = useCurrentLocale();

  if (!basicData) {
    return <RenderError />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg">Manufacturer Information</h1>
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-manufacturerName`}>
            Manufacturer Name
          </Label>
          <ValidatedInput
            id={`${idPrefix}-manufacturerName`}
            value={basicData.manufacturerName}
            onConfirm={(newValue) =>
              modifyBasicData((draft) => (draft.manufacturerName = newValue))
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-manufacturerUrl`}>
            Manufacturer URL
          </Label>
          <ValidatedInput
            id={`${idPrefix}-manufacturerUrl`}
            value={basicData.manufacturerUrl || ""}
            onConfirm={(newValue) =>
              modifyBasicData((draft) =>
                assignOrDelete(draft, "manufacturerUrl", newValue),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-manufacturerEstaId`}>
            Manufacturer ESTA ID
          </Label>
          <ValidatedInput
            id={`${idPrefix}-manufacturerEstaId`}
            value={basicData.manufacturerEstaId || ""}
            onConfirm={(newValue) =>
              modifyBasicData((draft) =>
                assignOrDelete(draft, "manufacturerEstaId", newValue),
              )
            }
          />
        </FieldSet>
      </div>
      <h1 className="text-lg">Model Information</h1>
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-modelName`}>Model Name</Label>
          <ValidatedInput
            id={`${idPrefix}-modelName`}
            value={basicData.modelName}
            onConfirm={(newValue) =>
              modifyBasicData((draft) => (draft.modelName = newValue))
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-category`}>Category</Label>
          <SelectField
            id={`${idPrefix}-category`}
            values={Object.values(modelCategories)}
            selectedValue={basicData.modelCategory}
            onSelectionChanged={(newValue) =>
              modifyBasicData((draft) => {
                draft.modelCategory = newValue as ModelCategory;
                draft.modelSubcategory = builderInfo.deviceClass
                  .modelCategoriesSubcategories[
                  newValue as ModelCategory
                ][0] as ModelSubcategory;
              })
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-subcategory`}>Subcategory</Label>
          <SelectField
            id={`${idPrefix}-subcategory`}
            values={
              builderInfo.deviceClass.modelCategoriesSubcategories[
                basicData.modelCategory
              ]
            }
            selectedValue={basicData.modelSubcategory}
            onSelectionChanged={(newValue) =>
              modifyBasicData((draft) => {
                draft.modelSubcategory = newValue as ModelSubcategory;
              })
            }
          />
        </FieldSet>
      </div>
      <h1 className="text-lg">Compatibility</h1>
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label id={`${idPrefix}-firmwareVersions`}>Firmware Versions</Label>
          <TagInput
            aria-labelledby={`${idPrefix}-firmwareVersions`}
            values={basicData.compatibleFirmwareVersions || []}
            onValuesChange={(newValue) =>
              modifyBasicData((draft) => {
                assignOrDelete(draft, "compatibleFirmwareVersions", newValue);
              })
            }
          />
        </FieldSet>
      </div>
      <h1 className="text-lg">Device Class Information</h1>
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-description`}>Description</Label>
          <ValidatedInput
            id={`${idPrefix}-description`}
            value={basicData.description.value || ""}
            onConfirm={(newValue) =>
              modifyBasicDataLocalizedValue("description", newValue, locale)
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-author`}>Author</Label>
          <ValidatedInput
            id={`${idPrefix}-author`}
            value={basicData.author}
            onConfirm={(newValue) =>
              modifyBasicData((draft) => (draft.author = newValue))
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-publishDate`}>Publish Date</Label>
          <ValidatedInput
            id={`${idPrefix}-publishDate`}
            value={basicData.publishDate}
            onConfirm={(newValue) =>
              modifyBasicData((draft) => (draft.publishDate = newValue))
            }
          />
        </FieldSet>
      </div>
    </div>
  );
};

import { useId } from "react";
import { Category, Subcategory } from "e173";
import builderInfo from "e173/extras/draft-2024-1/_builder.json";
import { RenderError } from "components/RenderError";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { SelectField } from "components/EditorFields/SelectField";
import { TagInput } from "components/TagInput";
import { assignOrDelete } from "utils/utils";
import {
  getLocalizedBasicData,
  modifyBasicData,
  modifyBasicDataDescription,
  useBasicData,
} from "./state";
import { useDeviceLocalizations } from "../state";

export const DeviceInfoEditor = () => {
  const unlocalizedBasicData = useBasicData();
  const localizations = useDeviceLocalizations();
  const idPrefix = useId();

  if (!unlocalizedBasicData) {
    return <RenderError />;
  }

  const basicData = getLocalizedBasicData(unlocalizedBasicData, localizations);

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
            value={basicData.info.manufacturer.name}
            onConfirm={(newValue) =>
              modifyBasicData(
                (draft) => (draft.info.manufacturer.name = newValue),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-manufacturerUrl`}>
            Manufacturer URL
          </Label>
          <ValidatedInput
            id={`${idPrefix}-manufacturerUrl`}
            value={basicData.info.manufacturer.url || ""}
            onConfirm={(newValue) =>
              modifyBasicData((draft) =>
                assignOrDelete(draft.info.manufacturer, "url", newValue),
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
            value={basicData.info.manufacturer.estaId || ""}
            onConfirm={(newValue) =>
              modifyBasicData((draft) =>
                assignOrDelete(draft.info.manufacturer, "estaId", newValue),
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
            value={basicData.info.model.name}
            onConfirm={(newValue) =>
              modifyBasicData((draft) => (draft.info.model.name = newValue))
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-category`}>Category</Label>
          <SelectField
            id={`${idPrefix}-category`}
            values={Object.values(Category)}
            selectedValue={basicData.info.model.category}
            onSelectionChanged={(newValue) =>
              modifyBasicData((draft) => {
                draft.info.model.category = newValue as Category;
                draft.info.model.subcategory = builderInfo.deviceClass
                  .modelCategoriesSubcategories[
                  newValue as Category
                ][0] as Subcategory;
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
                basicData.info.model.category
              ]
            }
            selectedValue={basicData.info.model.subcategory}
            onSelectionChanged={(newValue) =>
              modifyBasicData((draft) => {
                draft.info.model.subcategory = newValue as Subcategory;
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
            values={basicData.info.compatibility?.firmwareVersions || []}
            onValuesChange={(newValue) =>
              modifyBasicData((draft) => {
                draft.info.compatibility = {
                  firmwareVersions: newValue,
                };
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
            value={basicData.description}
            onConfirm={(newValue) => modifyBasicDataDescription(newValue)}
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

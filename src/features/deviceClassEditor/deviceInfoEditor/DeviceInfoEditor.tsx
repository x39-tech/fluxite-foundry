import { Trans } from "@lingui/react/macro";
import { useId } from "react";
import builderInfo from "e173/extras/draft-2026-1/_builder.json";
import { RenderError } from "components/RenderError";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { ValidatedTextarea } from "components/ValidatedTextarea";
import { SelectField } from "components/EditorFields/SelectField";
import { TagInput } from "components/TagInput";
import { assignOrDelete } from "utils/utils";
import { useAuthoringLocale } from "app/store";
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
  const locale = useAuthoringLocale();

  if (!basicData) {
    return <RenderError />;
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <h1 className="text-lg">
        <Trans id="deviceClassEditor.deviceInfo.manufacturerHeading">
          Manufacturer Information
        </Trans>
      </h1>
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-manufacturerName`}>
            <Trans id="deviceClassEditor.deviceInfo.manufacturerName">
              Manufacturer Name
            </Trans>
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
            <Trans id="deviceClassEditor.deviceInfo.manufacturerUrl">
              Manufacturer URL
            </Trans>
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
            <Trans id="deviceClassEditor.deviceInfo.manufacturerEstaId">
              Manufacturer ESTA ID
            </Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-manufacturerEstaId`}
            value={basicData.manufacturerEstaId || ""}
            onConfirm={(newValue) =>
              modifyBasicData((draft) =>
                assignOrDelete(
                  draft,
                  "manufacturerEstaId",
                  newValue === "" ? undefined : newValue,
                ),
              )
            }
          />
        </FieldSet>
      </div>
      <h1 className="text-lg">
        <Trans id="deviceClassEditor.deviceInfo.modelHeading">
          Model Information
        </Trans>
      </h1>
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-modelName`}>
            <Trans id="deviceClassEditor.deviceInfo.modelName">
              Model Name
            </Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-modelName`}
            value={basicData.modelName}
            onConfirm={(newValue) =>
              modifyBasicData((draft) => (draft.modelName = newValue))
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-category`}>
            <Trans id="deviceClassEditor.deviceInfo.category">Category</Trans>
          </Label>
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
          <Label htmlFor={`${idPrefix}-subcategory`}>
            <Trans id="deviceClassEditor.deviceInfo.subcategory">
              Subcategory
            </Trans>
          </Label>
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
      <h1 className="text-lg">
        <Trans id="deviceClassEditor.deviceInfo.compatibilityHeading">
          Compatibility
        </Trans>
      </h1>
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label id={`${idPrefix}-firmwareVersions`}>
            <Trans id="deviceClassEditor.deviceInfo.firmwareVersions">
              Firmware Versions
            </Trans>
          </Label>
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
      <h1 className="text-lg">
        <Trans id="deviceClassEditor.deviceInfo.deviceClassHeading">
          Device Class Information
        </Trans>
      </h1>
      <FieldSet>
        <Label htmlFor={`${idPrefix}-description`}>
          <Trans id="deviceClassEditor.deviceInfo.description">
            Description
          </Trans>
        </Label>
        <ValidatedTextarea
          className="max-w-2xl"
          id={`${idPrefix}-description`}
          value={basicData.description.value || ""}
          onConfirm={(newValue) =>
            modifyBasicDataLocalizedValue("description", newValue, locale)
          }
        />
      </FieldSet>
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-author`}>
            <Trans id="deviceClassEditor.deviceInfo.author">Author</Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-author`}
            value={basicData.author}
            onConfirm={(newValue) =>
              modifyBasicData((draft) => (draft.author = newValue))
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-publishDate`}>
            <Trans id="deviceClassEditor.deviceInfo.publishDate">
              Publish Date
            </Trans>
          </Label>
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

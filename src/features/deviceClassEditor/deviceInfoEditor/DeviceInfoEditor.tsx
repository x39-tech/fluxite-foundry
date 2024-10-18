import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import {
  OptionalTextEditorTableRow,
  TextEditorTableRow,
} from "utils/components/EditorFields/TextEditorField";
import { SelectTableRow } from "utils/components/EditorFields/SelectField";
import { Category, Subcategory } from "e173";
import builderInfo from "e173/extras/draft-2024-1/_builder.json";
import { TagInputTableRow } from "utils/components/EditorFields/TagInputField";
import { modifyBasicData, useBasicData } from "./state";
import { RenderError } from "utils/components/RenderError";

export const DeviceInfoEditor = () => {
  const basicData = useBasicData();
  if (!basicData) {
    return <RenderError />;
  }

  return (
    <div className="p-1 h-full flex flex-col">
      <SimplePropsTable name="Manufacturer Information">
        <TextEditorTableRow
          label="Manufacturer Name"
          defaultValue={basicData.info.manufacturer.name}
          onValueChanged={(newValue) =>
            modifyBasicData((draft) => {
              draft.info.manufacturer.name = newValue;
            })
          }
        />
        <OptionalTextEditorTableRow
          label="Manufacturer URL"
          defaultValue={basicData.info.manufacturer.url}
          onValueChanged={(newValue) =>
            modifyBasicData((draft) => {
              draft.info.manufacturer.url = newValue;
            })
          }
        />
        <OptionalTextEditorTableRow
          label="Manufacturer ESTA ID"
          defaultValue={basicData.info.manufacturer.estaId}
          onValueChanged={(newValue) =>
            modifyBasicData((draft) => {
              draft.info.manufacturer.estaId = newValue;
            })
          }
        />
      </SimplePropsTable>
      <SimplePropsTable name="Model Information">
        <TextEditorTableRow
          label="Model Name"
          defaultValue={basicData.info.model.name}
          onValueChanged={(newValue) =>
            modifyBasicData((draft) => {
              draft.info.model.name = newValue;
            })
          }
        />
        <SelectTableRow
          label="Category"
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
        <SelectTableRow
          label="Subcategory"
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
      </SimplePropsTable>
      <SimplePropsTable name="Compatibility">
        <TagInputTableRow
          label="Firmware Versions"
          values={basicData.info.compatibility?.firmwareVersions || []}
          onValuesChanged={(newValue) =>
            modifyBasicData((draft) => {
              draft.info.compatibility = {
                firmwareVersions: newValue,
              };
            })
          }
        />
      </SimplePropsTable>
      <SimplePropsTable name="UDR Device Class Information">
        <TextEditorTableRow
          label="Description"
          defaultValue={basicData["@description"]}
          onValueChanged={(newValue) =>
            modifyBasicData((draft) => {
              draft["@description"] = newValue;
            })
          }
        />
        <TextEditorTableRow
          label="Author"
          defaultValue={basicData.author}
          onValueChanged={(newValue) =>
            modifyBasicData((draft) => {
              draft.author = newValue;
            })
          }
        />
        <TextEditorTableRow
          label="Publish Date"
          defaultValue={basicData.publishDate}
          onValueChanged={(newValue) =>
            modifyBasicData((draft) => {
              draft.publishDate = newValue;
            })
          }
        />
      </SimplePropsTable>
    </div>
  );
};

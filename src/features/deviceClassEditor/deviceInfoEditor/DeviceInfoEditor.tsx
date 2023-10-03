// import { UdrDatabase } from "udr/udrDatabase";

import { useAppDispatch, useCurrentEditorSelector } from "app/hooks";
import produce from "immer";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { DispatchOnChangeFactory } from "utils/dispatchOnChangeFactory";
import { basicDataUpdated } from "features/deviceClassEditor/deviceClassEditorSlice";
import {
  OptionalTextEditorTableRow,
  TextEditorTableRow,
} from "utils/components/EditorFields/TextEditorField";
import { SelectTableRow } from "utils/components/EditorFields/SelectField";
import { Category, Subcategory } from "generated/draft-2023-1/udr-document";
import builderInfo from "e173/extras/draft-2023-1/_builder.json";
import { TagInputTableRow } from "utils/components/EditorFields/TagInputField";

// interface Props {
//   database: UdrDatabase;
// }

export const DeviceInfoEditor = () => {
  const dispatch = useAppDispatch();
  const basicData = useCurrentEditorSelector((state) => state.basicData);

  const onChangeFactory = new DispatchOnChangeFactory(
    basicData,
    (newValue, changeRecipe) => {
      dispatch(
        basicDataUpdated(
          produce(basicData, (draft) => changeRecipe(draft, newValue)),
        ),
      );
    },
  );

  return (
    <div className="p-1 h-full flex flex-col">
      <SimplePropsTable name="Manufacturer Information">
        <TextEditorTableRow
          label="Manufacturer Name"
          defaultValue={basicData.info.manufacturer.name}
          onValueChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.info.manufacturer.name = newValue;
          })}
        />
        <OptionalTextEditorTableRow
          label="Manufacturer URL"
          defaultValue={basicData.info.manufacturer.url}
          onValueChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.info.manufacturer.url = newValue;
          })}
        />
        <OptionalTextEditorTableRow
          label="Manufacturer ESTA ID"
          defaultValue={basicData.info.manufacturer["esta-id"]}
          onValueChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.info.manufacturer["esta-id"] = newValue;
          })}
        />
      </SimplePropsTable>
      <SimplePropsTable name="Model Information">
        <TextEditorTableRow
          label="Model Name"
          defaultValue={basicData.info.model.name}
          onValueChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.info.model.name = newValue;
          })}
        />
        <SelectTableRow
          label="Category"
          values={Object.values(Category)}
          selectedValue={basicData.info.model.category}
          onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.info.model.category = newValue as Category;
            draft.info.model.subcategory = builderInfo.deviceClass
              .modelCategoriesSubcategories[
              newValue as Category
            ][0] as Subcategory;
          })}
        />
        <SelectTableRow
          label="Subcategory"
          values={
            builderInfo.deviceClass.modelCategoriesSubcategories[
              basicData.info.model.category
            ]
          }
          selectedValue={basicData.info.model.subcategory}
          onSelectionChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.info.model.subcategory = newValue as Subcategory;
          })}
        />
      </SimplePropsTable>
      <SimplePropsTable name="Compatibility">
        <TagInputTableRow
          label="Firmware Versions"
          values={basicData.info.compatibility?.firmwareVersions || []}
          onValuesChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.info.compatibility = {
              firmwareVersions: newValue,
            };
          })}
        />
      </SimplePropsTable>
      <SimplePropsTable name="UDR Device Class Information">
        <TextEditorTableRow
          label="Description"
          defaultValue={basicData["@description"]}
          onValueChanged={onChangeFactory.getFn((draft, newValue) => {
            draft["@description"] = newValue;
          })}
        />
        <TextEditorTableRow
          label="Author"
          defaultValue={basicData.author}
          onValueChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.author = newValue;
          })}
        />
        <TextEditorTableRow
          label="Publish Date"
          defaultValue={basicData.publishDate}
          onValueChanged={onChangeFactory.getFn((draft, newValue) => {
            draft.publishDate = newValue;
          })}
        />
      </SimplePropsTable>
    </div>
  );
};

import { EditableText, HTMLSelect, TagInput } from "@blueprintjs/core";
import produce from "immer";
import { AppDispatch } from "app/store";
import { updateStructuredItem } from "features/fixtureEditor/fixtureEditorSlice";
import { StructuredItemValue } from "udr/objects/item";

type StringChangeRecipe = (
  draft: StructuredItemValue,
  newValue: string
) => void;

type StringListChangeRecipe = (
  draft: StructuredItemValue,
  newValue: string[]
) => void;

export class StructuredItemFieldFactory {
  udr: StructuredItemValue;
  structuredItemName: string;
  dispatch: AppDispatch;

  constructor(
    structuredItemName: string,
    udr: StructuredItemValue,
    dispatch: AppDispatch
  ) {
    this.structuredItemName = structuredItemName;
    this.udr = udr;
    this.dispatch = dispatch;
  }

  getTextEditorRow(
    name: string,
    value: string | undefined,
    changeRecipe: StringChangeRecipe
  ) {
    return (
      <tr>
        <td>{name}</td>
        <td>
          <EditableText
            defaultValue={value}
            onConfirm={(newValue: string) => {
              this.dispatch(
                updateStructuredItem({
                  name: this.structuredItemName,
                  newValue: produce(this.udr, (draft) => {
                    changeRecipe(draft, newValue);
                  }),
                })
              );
            }}
          />
        </td>
      </tr>
    );
  }

  getSelectRow(
    name: string,
    values: string[],
    selectedValue: string,
    changeRecipe: StringChangeRecipe
  ) {
    return (
      <tr>
        <td>{name}</td>
        <td>
          <HTMLSelect
            options={values}
            defaultValue={selectedValue}
            onChange={(event) => {
              this.dispatch(
                updateStructuredItem({
                  name: "deviceIdentification",
                  newValue: produce(this.udr, (draft) => {
                    changeRecipe(draft, event.currentTarget.value);
                  }),
                })
              );
            }}
          />
        </td>
      </tr>
    );
  }

  getTagListRow(
    name: string,
    values: string[],
    changeRecipe: StringListChangeRecipe
  ) {
    return (
      <tr>
        <td>{name}</td>
        <td>
          <TagInput
            values={values}
            onChange={(values) => {
              this.dispatch(
                updateStructuredItem({
                  name: this.structuredItemName,
                  newValue: produce(this.udr, (draft) => {
                    changeRecipe(
                      draft,
                      values.map((value) => value as string)
                    );
                  }),
                })
              );
            }}
          />
        </td>
      </tr>
    );
  }
}

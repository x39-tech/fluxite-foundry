import { Colors } from "@blueprintjs/core";
import { useAppDispatch } from "app/hooks";
import produce from "immer";
import { ScalarItem } from "udr/objects/item";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { ItemEditor } from "utils/components/ItemEditor/ItemEditor";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { DispatchOnChangeFactory } from "utils/dispatchOnChangeFactory";
import { validateStringIsNumber } from "utils/inputValidation";
import { updateScalarItem } from "../fixtureEditorSlice";
import "./ScalarItemEditor.css";

export interface ScalarItemEditorProps {
  id: string;
  udr: ScalarItem;
}

export const ScalarItemEditor: React.FC<ScalarItemEditorProps> = ({
  id,
  udr,
}) => {
  const dispatch = useAppDispatch();

  const onChangeFactory = new DispatchOnChangeFactory(
    udr,
    (newValue, changeRecipe) => {
      dispatch(
        updateScalarItem({
          id,
          newValue: produce(udr, (draft) => changeRecipe(draft, newValue)),
        })
      );
    }
  );

  return (
    <ItemEditor
      title={udr.friendlyName ? udr.friendlyName! : id}
      backgroundColor={{ light: Colors.SEPIA5, dark: Colors.SEPIA1 }}
    >
      <div className="scalar-item-collapse-body">
        <SimplePropsTable>
          <tr>
            <td>Class</td>
            <td>
              <pre>{udr.class}</pre>
            </td>
          </tr>
          <TextEditorTableRow
            label="Minimum Value"
            defaultValue={`${udr.minimum}`}
            onValueChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.minimum = parseFloat(newValue);
            })}
            validator={validateStringIsNumber}
          />
          <TextEditorTableRow
            label="Maximum Value"
            defaultValue={`${udr.maximum}`}
            onValueChanged={onChangeFactory.getFn((draft, newValue) => {
              draft.maximum = parseFloat(newValue);
            })}
            validator={validateStringIsNumber}
          />
        </SimplePropsTable>
      </div>
    </ItemEditor>
  );
};

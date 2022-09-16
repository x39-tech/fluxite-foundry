import { useState } from "react";
import { Button, Classes, H3 } from "@blueprintjs/core";
import { useAppDispatch } from "app/hooks";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { ScalarItemClassDisplay } from "utils/components/ScalarItemClassDisplay/ScalarItemClassDisplay";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { validateNewItemId } from "utils/inputValidation";
import { getAllScalarItemsWithIds } from "utils/itemDatabase";
import { newScalarItemCreated } from "./scalarItemsEditorSlice";
import { ItemClassSelector } from "utils/components/ItemClassSelector/ItemClassSelector";
import { getUniqueItemId } from "utils/utils";
import { useCurrentEditorSelector } from "../fixtureEditorsState";
import "./NewScalarItemDialog.css";

export interface NewScalarItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewScalarItemDialog: React.FC<NewScalarItemDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const scalarItemIds = useCurrentEditorSelector((state) =>
    Object.keys(state.scalarItems.scalarItems)
  );

  const [newItemClass, setNewItemClass] = useState(
    getAllScalarItemsWithIds()[0]
  );
  const [newItemId, setNewItemId] = useState(getUniqueItemId(scalarItemIds));
  const [newItemFriendlyName, setNewItemFriendlyName] = useState("My New Item");

  // Flush relevant parts of the state when the dialog was just opened
  const [wasOpen, setWasOpen] = useState(true);
  if (isOpen !== wasOpen) {
    if (isOpen) {
      setNewItemId(getUniqueItemId(scalarItemIds));
      setNewItemFriendlyName("My New Item");
    }
    setWasOpen(isOpen);
  }

  const dispatch = useAppDispatch();

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>New Scalar Item</H3>
      </div>
      <div className={"new-scalar-item-body " + Classes.DIALOG_BODY}>
        <SimplePropsTable>
          <tr>
            <td style={{ verticalAlign: "middle" }}>Class</td>
            <td>
              <ItemClassSelector
                itemClasses={getAllScalarItemsWithIds()}
                selectedClass={newItemClass}
                onSelectedClassChanged={setNewItemClass}
                tooltipRenderer={(item) => (
                  <ScalarItemClassDisplay udr={item} />
                )}
              />
            </td>
          </tr>
          <TextEditorTableRow
            label="ID"
            defaultValue={newItemId}
            onValueChanged={setNewItemId}
            validator={(input) => validateNewItemId(input, scalarItemIds)}
            validationErrorPlacement="right"
          />
          <TextEditorTableRow
            label="Display Name"
            defaultValue={newItemFriendlyName}
            onValueChanged={setNewItemFriendlyName}
          />
        </SimplePropsTable>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <Button
          intent="success"
          icon="tick"
          onClick={() => {
            dispatch(
              newScalarItemCreated({
                class: newItemClass.fullyQualifiedId,
                id: newItemId,
                friendlyName: newItemFriendlyName,
              })
            );

            onClose();
          }}
        >
          Add
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </DarkModeAwareDialog>
  );
};

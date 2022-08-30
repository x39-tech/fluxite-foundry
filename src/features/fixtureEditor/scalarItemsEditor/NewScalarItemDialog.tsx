import { Button, Classes, H3 } from "@blueprintjs/core";
import { useAppSelector } from "app/hooks";
import { useState } from "react";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import "./NewScalarItemDialog.css";
import {
  getDefaultSelectedClass,
  ScalarItemClassSelector,
} from "./ScalarItemClassSelector";

export interface NewScalarItemDialogProps {
  isOpen: boolean;
  onAccepted: () => void;
  onCanceled: () => void;
}

export const NewScalarItemDialog: React.FC<NewScalarItemDialogProps> = ({
  isOpen,
  onAccepted,
  onCanceled,
}) => {
  const scalarItemIds = useAppSelector((state) =>
    Object.keys(
      state.fixtureEditor.openEditors[state.fixtureEditor.selectedEditor].udr
        .scalarItems || {}
    )
  );

  const [newItemClass, setNewItemClass] = useState(getDefaultSelectedClass());
  const [newItemId, setNewItemId] = useState(getNewItemId(scalarItemIds));
  // const [newItemFriendlyName, setNewItemFriendlyName] = useState("");

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onCanceled}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>New Scalar Item</H3>
      </div>
      <div className={"new-scalar-item-body " + Classes.DIALOG_BODY}>
        <SimplePropsTable>
          <tr>
            <td style={{ verticalAlign: "middle" }}>Class</td>
            <td>
              <ScalarItemClassSelector
                selectedClass={newItemClass}
                onSelectedClassChanged={(newItemClass) =>
                  setNewItemClass(newItemClass)
                }
              />
            </td>
          </tr>
          <TextEditorTableRow
            label="ID"
            defaultValue={newItemId}
            onValueChanged={setNewItemId}
            validator={(input) => {
              if (!input) {
                return { isValid: false, feedback: "ID must not be empty" };
              }
              if (scalarItemIds.includes(input)) {
                return {
                  isValid: false,
                  feedback:
                    "ID must be unique among all scalar items in the device",
                };
              }
              return { isValid: true };
            }}
            validationErrorPlacement="right"
          />
        </SimplePropsTable>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <Button intent="success" icon="tick" onClick={onAccepted}>
          Add
        </Button>
        <Button onClick={onCanceled}>Cancel</Button>
      </div>
    </DarkModeAwareDialog>
  );
};

function getNewItemId(existingItemIds: string[]): string {
  let deDupNumber = 1;
  let newItemId = "my-new-item";
  while (existingItemIds.includes(newItemId)) {
    newItemId = `my-new-item-${deDupNumber++}`;
  }
  return newItemId;
}

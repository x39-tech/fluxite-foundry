import { Button, Classes, H3 } from "@blueprintjs/core";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { useState } from "react";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { validateNewScalarItemId } from "utils/inputValidation";
import { createNewScalarItem } from "../fixtureEditorSlice";
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
  const [newItemId, setNewItemId] = useState("my-new-item");
  const [newItemFriendlyName, setNewItemFriendlyName] = useState("My New Item");

  const deDupedId = deDuplicateNewItemId(newItemId, scalarItemIds);
  if (deDupedId !== newItemId) {
    setNewItemId(deDupedId);
  }

  const dispatch = useAppDispatch();

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
            validator={(input) => validateNewScalarItemId(input, scalarItemIds)}
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
              createNewScalarItem({
                class: newItemClass,
                id: newItemId,
                friendlyName: newItemFriendlyName,
              })
            );

            onAccepted();
          }}
        >
          Add
        </Button>
        <Button onClick={onCanceled}>Cancel</Button>
      </div>
    </DarkModeAwareDialog>
  );
};

function deDuplicateNewItemId(
  newItemId: string,
  existingItemIds: string[]
): string {
  let deDupNumber = 1;
  let deDupedNewItemId = newItemId;
  while (existingItemIds.includes(deDupedNewItemId)) {
    deDupedNewItemId = `${newItemId}-${deDupNumber++}`;
  }
  return deDupedNewItemId;
}

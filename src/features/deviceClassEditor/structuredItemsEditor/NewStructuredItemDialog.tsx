import { Button, Classes, H3 } from "@blueprintjs/core";
import { useState } from "react";
import { useAppDispatch, useCurrentEditorSelector } from "app/hooks";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { ItemClassSelector } from "utils/components/ItemClassSelector/ItemClassSelector";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { StructuredItemClassDisplay } from "utils/components/StructuredItemClassDisplay/StructuredItemClassDisplay";
import { validateNewItemId } from "utils/inputValidation";
import { getAllStructuredItemsWithIds } from "utils/itemDatabase";
import { getUniqueItemId } from "utils/utils";
import { newStructuredItemCreated } from "./structuredItemsEditorSlice";
import "./NewStructuredItemDialog.css";

export interface NewStructuredItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewStructuredItemDialog: React.FC<
  NewStructuredItemDialogProps
> = ({ isOpen, onClose }) => {
  const structuredItemIds = useCurrentEditorSelector((state) =>
    Object.keys(state.structuredItems.structuredItems)
  );

  const [newItemClass, setNewItemClass] = useState(
    getAllStructuredItemsWithIds()[0]
  );
  const [newItemId, setNewItemId] = useState(
    getUniqueItemId(structuredItemIds)
  );

  // Flush relevant parts of the state when the dialog was just opened
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    if (isOpen) {
      setNewItemId(getUniqueItemId(structuredItemIds));
    }
    setWasOpen(isOpen);
  }

  const dispatch = useAppDispatch();

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>New Structured Item</H3>
      </div>
      <div className={"new-structured-item-body " + Classes.DIALOG_BODY}>
        <SimplePropsTable>
          <tr>
            <td style={{ verticalAlign: "middle" }}>Class</td>
            <td>
              <ItemClassSelector
                itemClasses={getAllStructuredItemsWithIds()}
                selectedClass={newItemClass}
                onSelectedClassChanged={setNewItemClass}
                tooltipRenderer={(item) => (
                  <StructuredItemClassDisplay udr={item} />
                )}
              />
            </td>
          </tr>
          <TextEditorTableRow
            label="ID"
            defaultValue={newItemId}
            onValueChanged={setNewItemId}
            validator={(input) => validateNewItemId(input, structuredItemIds)}
            validationErrorPlacement="right"
          />
        </SimplePropsTable>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <Button
          intent="success"
          icon="tick"
          onClick={() => {
            dispatch(
              newStructuredItemCreated({
                class: newItemClass.fullyQualifiedId,
                id: newItemId,
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

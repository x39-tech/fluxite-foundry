import { Button, Classes, H3 } from "@blueprintjs/core";
import { useState } from "react";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { ItemClassSelector } from "utils/components/ItemClassSelector/ItemClassSelector";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { StructureClassDisplay } from "utils/components/StructureClassDisplay/StructureClassDisplay";
import { validateNewItemId } from "utils/inputValidation";
import { UdrDatabase, getAllStructuresWithIds } from "udr/udrDatabase";
import { getUniqueItemId } from "utils/utils";
import { createNewStructure, useStructureIds } from "./state";
import "./NewStructureDialog.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  database: UdrDatabase;
}

export const NewStructureDialog = ({ isOpen, onClose, database }: Props) => {
  const structureIds = useStructureIds();

  const [newItemClass, setNewItemClass] = useState(
    getAllStructuresWithIds(database)[0],
  );
  const [newItemId, setNewItemId] = useState(getUniqueItemId(structureIds));

  // Flush relevant parts of the state when the dialog was just opened
  const [wasOpen, setWasOpen] = useState(false);
  if (isOpen !== wasOpen) {
    if (isOpen) {
      setNewItemId(getUniqueItemId(structureIds));
    }
    setWasOpen(isOpen);
  }

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>New Structure</H3>
      </div>
      <div className={"new-structure-body " + Classes.DIALOG_BODY}>
        <SimplePropsTable>
          <tr>
            <td style={{ verticalAlign: "middle" }}>Class</td>
            <td>
              <ItemClassSelector
                itemClasses={getAllStructuresWithIds(database)}
                selectedClass={newItemClass}
                onSelectedClassChanged={setNewItemClass}
                tooltipRenderer={(item) => (
                  <StructureClassDisplay udr={item} database={database} />
                )}
                database={database}
              />
            </td>
          </tr>
          <TextEditorTableRow
            label="ID"
            defaultValue={newItemId}
            onValueChanged={setNewItemId}
            validator={(input) => validateNewItemId(input, structureIds)}
            validationErrorPlacement="right"
          />
        </SimplePropsTable>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <Button
          intent="success"
          icon="tick"
          onClick={() => {
            createNewStructure(
              newItemClass.libraryId,
              newItemClass.id,
              newItemId,
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

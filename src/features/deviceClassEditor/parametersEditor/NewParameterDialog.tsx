import { useState } from "react";
import { Button, Classes, H3 } from "@blueprintjs/core";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { ParameterClassDisplay } from "utils/components/ParameterClassDisplay/ParameterClassDisplay";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { validateNewItemId } from "utils/inputValidation";
import { getAllParametersWithIds } from "udr/udrDatabase";
import { ItemClassSelector } from "utils/components/ItemClassSelector/ItemClassSelector";
import { getUniqueItemId } from "utils/utils";
import { createNewParameter, useParameterIds } from "./state";
import { useUdrDatabase } from "app/state";
import "./NewParameterDialog.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewParameterDialog = ({ isOpen, onClose }: Props) => {
  const database = useUdrDatabase();
  const parameterIds = useParameterIds();

  const [newItemClass, setNewItemClass] = useState(
    getAllParametersWithIds(database)[0],
  );
  const [newItemId, setNewItemId] = useState(getUniqueItemId(parameterIds));
  const [newItemFriendlyName, setNewItemFriendlyName] = useState("My New Item");

  // Flush relevant parts of the state when the dialog was just opened
  const [wasOpen, setWasOpen] = useState(true);
  if (isOpen !== wasOpen) {
    if (isOpen) {
      setNewItemId(getUniqueItemId(parameterIds));
      setNewItemFriendlyName("My New Item");
    }
    setWasOpen(isOpen);
  }

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>New Parameter</H3>
      </div>
      <div className={"new-parameter-body " + Classes.DIALOG_BODY}>
        <SimplePropsTable>
          <tr>
            <td id="class-label" style={{ verticalAlign: "middle" }}>
              Class
            </td>
            <td>
              <ItemClassSelector
                itemClasses={getAllParametersWithIds(database)}
                selectedClass={newItemClass}
                aria-labelledby="class-label"
                onSelectedClassChanged={setNewItemClass}
                tooltipRenderer={(item) => (
                  <ParameterClassDisplay paramClass={item} />
                )}
                database={database}
              />
            </td>
          </tr>
          <TextEditorTableRow
            label="ID"
            defaultValue={newItemId}
            onValueChanged={setNewItemId}
            validator={(input) => validateNewItemId(input, parameterIds)}
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
          aria-label="Add"
          intent="success"
          icon="tick"
          onClick={() => {
            createNewParameter(
              newItemClass.libraryId,
              newItemClass.id,
              newItemId,
              newItemFriendlyName,
            );

            onClose();
          }}
        >
          Add
        </Button>
        <Button aria-label="Cancel" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </DarkModeAwareDialog>
  );
};

import { useState } from "react";
import { Classes, H3 } from "@blueprintjs/core";
import { Button } from "components/Button";
import { DarkModeAwareDialog } from "components/DarkModeAwareDialog";
import { TextEditorTableRow } from "components/EditorFields/TextEditorField";
import { ParameterClassDisplay } from "components/ParameterClassDisplay";
import { SimplePropsTable } from "components/SimplePropsTable";
import { validateNewItemId } from "utils/inputValidation";
import {
  getAllParametersWithIds,
  lookupParameterClass,
  ParameterClassWithId,
} from "udr/udrDatabase";
import { useUdrDatabase } from "app/store";
import { ItemClassSelector } from "components/ItemClassSelector/ItemClassSelector";
import { getUniqueItemId } from "utils/utils";
import { createNewParameter, useParameterIds } from "./state";
import "./NewParameterDialog.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewParameterDialog = ({ isOpen, onClose }: Props) => {
  const database = useUdrDatabase();
  const parameterIds = useParameterIds();

  const [newItemClass, setNewItemClass] = useState<
    ParameterClassWithId | undefined
  >(undefined);
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
                tooltipRenderer={(item) => {
                  // TODO clean up
                  const resolvedClass = lookupParameterClass(
                    database,
                    item.libraryId,
                    item.libraryVersion,
                    item.id,
                  );
                  return <ParameterClassDisplay paramClass={resolvedClass!} />;
                }}
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
          icon="CheckIcon"
          disabled={!newItemClass}
          onClick={() => {
            if (newItemClass) {
              createNewParameter(
                newItemClass.libraryId,
                newItemClass.id,
                newItemId,
                newItemFriendlyName,
              );
            }

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

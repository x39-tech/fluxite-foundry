import { useState } from "react";
import { Button, Classes, H3 } from "@blueprintjs/core";
import { useAppDispatch, useCurrentEditorSelector } from "app/hooks";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import { TextEditorTableRow } from "utils/components/EditorFields/TextEditorField";
import { ParameterClassDisplay } from "utils/components/ParameterClassDisplay/ParameterClassDisplay";
import { SimplePropsTable } from "utils/components/SimplePropsTable/SimplePropsTable";
import { validateNewItemId } from "utils/inputValidation";
import { getAllParametersWithIds, getFullyQualifiedId } from "udr/udrDatabase";
import { newParameterCreated } from "./parametersEditorSlice";
import { ItemClassSelector } from "utils/components/ItemClassSelector/ItemClassSelector";
import { getUniqueItemId } from "utils/utils";
import "./NewParameterDialog.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewParameterDialog = ({ isOpen, onClose }: Props) => {
  const parameterIds = useCurrentEditorSelector((state) =>
    Object.keys(state.parameters.parameters),
  );

  const [newItemClass, setNewItemClass] = useState(
    getAllParametersWithIds()[0],
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

  const dispatch = useAppDispatch();

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>New Parameter</H3>
      </div>
      <div className={"new-parameter-body " + Classes.DIALOG_BODY}>
        <SimplePropsTable>
          <tr>
            <td style={{ verticalAlign: "middle" }}>Class</td>
            <td>
              <ItemClassSelector
                itemClasses={getAllParametersWithIds()}
                selectedClass={newItemClass}
                onSelectedClassChanged={setNewItemClass}
                tooltipRenderer={(item) => <ParameterClassDisplay udr={item} />}
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
          intent="success"
          icon="tick"
          onClick={() => {
            dispatch(
              newParameterCreated({
                class: getFullyQualifiedId(newItemClass),
                id: newItemId,
                friendlyName: newItemFriendlyName,
              }),
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

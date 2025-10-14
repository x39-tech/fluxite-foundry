import { useEffect, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { Button } from "components/scn-ui/Button";
import { TextEditorTableRow } from "components/EditorFields/DeprecatedTextEditorField";
import { SimplePropsTable } from "components/SimplePropsTable";
import { ItemClassSelector } from "components/ItemClassSelector";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { ParameterClassDisplay } from "./ParameterClassDisplay";
import { validateNewItemId } from "utils/inputValidation";
import { lookupParameterClass, ParameterClassWithId } from "udr/udrDatabase";
import { useUdrDatabase } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { createNewParameter, useParameterIds } from "./state";

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
  useEffect(() => {
    if (isOpen) {
      setNewItemId(getUniqueItemId(parameterIds));
      setNewItemFriendlyName("My New Item");
    }
  }, [isOpen]);

  const renderItemClassTooltip = (item: ParameterClassWithId) => {
    // TODO clean up
    const resolvedClass = lookupParameterClass(
      database,
      item.libraryId,
      item.libraryVersion,
      item.id,
    );
    return <ParameterClassDisplay paramClass={resolvedClass!} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Parameter</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col">
          <SimplePropsTable>
            <tr>
              <td id="class-label">Class</td>
              <td>
                <ItemClassSelector
                  selectedClass={newItemClass}
                  aria-labelledby="class-label"
                  librarySelector={(library) =>
                    (library.parameterClasses &&
                      Object.entries(library.parameterClasses)) ||
                    []
                  }
                  onSelectedClassChanged={setNewItemClass}
                  tooltipRenderer={renderItemClassTooltip}
                  database={database}
                />
              </td>
            </tr>
            <TextEditorTableRow
              label="ID"
              value={newItemId}
              onValueChanged={setNewItemId}
              validator={(input) => validateNewItemId(input, parameterIds)}
              validationErrorPlacement="right"
            />
            <TextEditorTableRow
              label="Display Name"
              value={newItemFriendlyName}
              onValueChanged={setNewItemFriendlyName}
            />
          </SimplePropsTable>
        </div>
        <DialogFooter>
          <Button
            aria-label="Add"
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
            <CheckIcon />
            Add
          </Button>
          <Button variant="secondary" aria-label="Cancel" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

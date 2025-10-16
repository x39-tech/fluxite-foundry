import { useEffect, useId, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useUdrDatabase } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { FieldSet } from "components/FieldSet";
import { ItemClassSelector } from "components/ItemClassSelector";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { Button } from "components/scn-ui/Button";
import { CommandClassWithId, lookupCommandClass } from "udr/udrDatabase";
import { createNewCommand, useCommandIds } from "./state";
import { CommandClassDisplay } from "./CommandClassDisplay";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewCommandDialog = ({ isOpen, onClose }: Props) => {
  const database = useUdrDatabase();
  const commandIds = useCommandIds();

  const classSelectorId = useId();
  const idId = useId();
  const friendlyNameId = useId();

  const [newItemClass, setNewItemClass] = useState<
    CommandClassWithId | undefined
  >(undefined);
  const [newItemId, setNewItemId] = useState(getUniqueItemId(commandIds));
  const [newItemFriendlyName, setNewItemFriendlyName] = useState("My New Item");

  // Flush relevant parts of the state when the dialog was just opened
  useEffect(() => {
    if (isOpen) {
      setNewItemId(getUniqueItemId(commandIds));
      setNewItemFriendlyName("My New Item");
    }
  }, [isOpen]);

  const renderItemClassTooltip = (item: CommandClassWithId) => {
    // TODO clean up
    const resolvedClass = lookupCommandClass(
      database,
      item.libraryId,
      item.libraryVersion,
      item.id,
    );
    return <CommandClassDisplay commandClass={resolvedClass!} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Command</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldSet>
            <Label htmlFor={classSelectorId}>Class</Label>
            <ItemClassSelector
              id={classSelectorId}
              selectedClass={newItemClass}
              librarySelector={(library) =>
                (library.commandClasses &&
                  Object.entries(library.commandClasses)) ||
                []
              }
              onSelectedClassChanged={setNewItemClass}
              tooltipRenderer={renderItemClassTooltip}
              database={database}
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={idId}>ID</Label>
            <ValidatedInput
              id={idId}
              value={newItemId}
              onConfirm={setNewItemId}
              validator={(input) => validateNewItemId(input, commandIds)}
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={friendlyNameId}>Display Name</Label>
            <ValidatedInput
              id={friendlyNameId}
              value={newItemFriendlyName}
              onConfirm={setNewItemFriendlyName}
            />
          </FieldSet>
        </div>
        <DialogFooter>
          <Button
            aria-label="Add"
            disabled={!newItemClass}
            onClick={() => {
              if (newItemClass) {
                createNewCommand(
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

import { useEffect, useId, useState } from "react";
import { CheckIcon } from "lucide-react";
import { useCurrentLocale, useLibraryStore } from "app/store";
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
import {
  ItemClassSelector,
  SelectedItemClass,
} from "components/ItemClassSelector";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { Button } from "components/scn-ui/Button";
import { CodexId } from "app/persistentState";
import { createNewCommand, useCommandCodexIds } from "./state";
import { CommandClassDisplay } from "./CommandClassDisplay";
import { lookupCommandClass } from "../stateTransformations";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewCommandDialog = ({ isOpen, onClose }: Props) => {
  const libraryStore = useLibraryStore();
  const commandCodexIds = useCommandCodexIds();
  const locale = useCurrentLocale();

  const classSelectorId = useId();
  const idId = useId();
  const friendlyNameId = useId();

  const [newItemClass, setNewItemClass] = useState<
    SelectedItemClass | undefined
  >(undefined);
  const [newItemId, setNewItemId] = useState(getUniqueItemId(commandCodexIds));
  const [newItemFriendlyName, setNewItemFriendlyName] = useState("My New Item");

  // Flush relevant parts of the state when the dialog was just opened
  useEffect(() => {
    if (isOpen) {
      setNewItemId(getUniqueItemId(commandCodexIds));
      setNewItemFriendlyName("My New Item");
    }
  }, [isOpen]);

  const renderItemClassTooltip = (item: SelectedItemClass) => {
    const resolvedClass = lookupCommandClass(item.resolved, locale);
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
              kind="commandClasses"
              onSelectedClassChanged={setNewItemClass}
              tooltipRenderer={renderItemClassTooltip}
              libraryStore={libraryStore}
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={idId}>ID</Label>
            <ValidatedInput
              id={idId}
              value={newItemId}
              onConfirm={setNewItemId}
              validator={(input) => validateNewItemId(input, commandCodexIds)}
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
                  newItemClass.codexId,
                  CodexId(newItemId),
                  newItemFriendlyName,
                  locale,
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

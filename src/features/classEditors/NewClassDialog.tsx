import { useEffect, useId, useState } from "react";
import { CheckIcon } from "lucide-react";
import { CodexId } from "app/persistentState";
import { useCurrentLocale } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import { Button } from "components/scn-ui/Button";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { ClassKind } from "./context";
import {
  CLASS_KIND_NAMES,
  useClassCodexIds,
  useClassOperations,
} from "./state";

interface Props {
  kind: ClassKind;
  isOpen: boolean;
  onClose: () => void;
}

export const NewClassDialog = ({ kind, isOpen, onClose }: Props) => {
  const takenIds = useClassCodexIds(kind);
  const operations = useClassOperations();
  const locale = useCurrentLocale();

  const kindName = CLASS_KIND_NAMES[kind];
  const idPrefix = useId();

  const [newId, setNewId] = useState(getUniqueItemId(takenIds));
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNewId(getUniqueItemId(takenIds));
      setNewName("");
    }
  }, [isOpen]);

  const idIsValid = validateNewItemId(newId, takenIds).isValid;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {kindName}</DialogTitle>
          <DialogDescription>
            Create a new {kindName.toLowerCase()} by providing an ID and a name
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldSet>
            <Label htmlFor={`${idPrefix}-id`}>ID</Label>
            <ValidatedInput
              id={`${idPrefix}-id`}
              value={newId}
              onConfirm={setNewId}
              validator={(input) => validateNewItemId(input, takenIds)}
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={`${idPrefix}-name`}>Name</Label>
            <ValidatedInput
              id={`${idPrefix}-name`}
              value={newName}
              placeholder="Defaults to the ID"
              onConfirm={setNewName}
            />
          </FieldSet>
        </div>
        <DialogFooter>
          <Button
            aria-label="Add"
            disabled={!idIsValid}
            onClick={() => {
              operations.createClass(
                kind,
                CodexId(newId),
                newName.trim() || newId,
                locale,
              );
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

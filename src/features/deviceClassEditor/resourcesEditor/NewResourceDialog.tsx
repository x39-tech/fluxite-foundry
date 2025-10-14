import { CheckIcon } from "@heroicons/react/24/solid";
import { useUdrDatabase } from "app/store";
import { useEffect, useId, useState } from "react";
import { getUniqueItemId } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import { lookupResourceClass, ResourceClassWithId } from "udr/udrDatabase";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { Label } from "components/scn-ui/Label";
import { Button } from "components/scn-ui/Button";
import { ItemClassSelector } from "components/ItemClassSelector";
import { ValidatedInput } from "components/ValidatedInput";
import { ResourceClassDisplay } from "./ResourceClassDisplay";
import { createNewResource, useResourceIds } from "./state";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewResourceDialog = ({ isOpen, onClose }: Props) => {
  const database = useUdrDatabase();
  const resourceIds = useResourceIds();

  const classSelectorId = useId();
  const idId = useId();
  const friendlyNameId = useId();

  const [newItemClass, setNewItemClass] = useState<
    ResourceClassWithId | undefined
  >(undefined);
  const [newItemId, setNewItemId] = useState(getUniqueItemId(resourceIds));
  const [newItemFriendlyName, setNewItemFriendlyName] = useState("My New Item");

  // Flush relevant parts of the state when the dialog was just opened
  useEffect(() => {
    if (isOpen) {
      setNewItemId(getUniqueItemId(resourceIds));
      setNewItemFriendlyName("My New Item");
    }
  }, [isOpen]);

  const renderItemClassTooltip = (item: ResourceClassWithId) => {
    // TODO clean up
    const resolvedClass = lookupResourceClass(
      database,
      item.libraryId,
      item.libraryVersion,
      item.id,
    );
    return <ResourceClassDisplay resourceClass={resolvedClass!} />;
  };

  const FieldSet = ({ children }: { children: React.ReactNode[] }) => (
    <div className="flex flex-col gap-2">{children}</div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Resource</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldSet>
            <Label htmlFor={classSelectorId}>Class</Label>
            <ItemClassSelector
              id={classSelectorId}
              selectedClass={newItemClass}
              librarySelector={(library) =>
                (library.resourceClasses &&
                  Object.entries(library.resourceClasses)) ||
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
              validator={(input) => validateNewItemId(input, resourceIds)}
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
                createNewResource(
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

import { useEffect, useId, useState } from "react";
import { CheckIcon } from "@heroicons/react/24/solid";
import { useCurrentLocale, useUdrDatabase } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
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
import { FieldSet } from "components/FieldSet";
import { ResourceClassDisplay } from "./ResourceClassDisplay";
import { createNewResource, useResourceCodexIds } from "./state";
import { ItemClassWithId } from "codex/codexDatabase";
import { lookupResourceClass } from "../stateTransformations";
import { CodexId } from "app/persistentState";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewResourceDialog = ({ isOpen, onClose }: Props) => {
  const database = useUdrDatabase();
  const resourceIds = useResourceCodexIds();
  const locale = useCurrentLocale();

  const idPrefix = useId();

  const [newItemClass, setNewItemClass] = useState<ItemClassWithId | undefined>(
    undefined,
  );
  const [newItemId, setNewItemId] = useState(getUniqueItemId(resourceIds));
  const [newItemFriendlyName, setNewItemFriendlyName] = useState("My New Item");

  // Flush relevant parts of the state when the dialog was just opened
  useEffect(() => {
    if (isOpen) {
      setNewItemId(getUniqueItemId(resourceIds));
      setNewItemFriendlyName("My New Item");
    }
  }, [isOpen]);

  const renderItemClassTooltip = (item: ItemClassWithId) => {
    if (item.type === "local") {
      // TODO: handle
      return <></>;
    }

    const resolvedClass = lookupResourceClass(
      database,
      item.codexId,
      item.libraryId,
      item.libraryVersion,
      locale,
    );
    return <ResourceClassDisplay resourceClass={resolvedClass!} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Resource</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldSet>
            <Label htmlFor={`${idPrefix}-class`}>Class</Label>
            <ItemClassSelector
              id={`${idPrefix}-class`}
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
            <Label htmlFor={`${idPrefix}-id`}>ID</Label>
            <ValidatedInput
              id={`${idPrefix}-id`}
              value={newItemId}
              onConfirm={setNewItemId}
              validator={(input) => validateNewItemId(input, resourceIds)}
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={`${idPrefix}-friendlyName`}>Display Name</Label>
            <ValidatedInput
              id={`${idPrefix}-friendlyName`}
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
              if (newItemClass && newItemClass.type === "imported") {
                // TODO: handle local classes
                createNewResource(
                  newItemClass.libraryId,
                  newItemClass.codexId,
                  CodexId(newItemId),
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

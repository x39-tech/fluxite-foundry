import { useEffect, useId, useState } from "react";
import { CheckIcon } from "lucide-react";
import { CodexId } from "app/persistentState";
import { useCurrentLocale } from "app/store";
import {
  FullCategoryId,
  joinParameterClassId,
  splitParameterClassId,
} from "codex/categories";
import { useCategoryCatalog } from "hooks/useCategoryCatalog";
import { getUniqueItemId } from "utils/utils";
import { validateNewItemId } from "utils/inputValidation";
import { Button } from "components/scn-ui/Button";
import { CategoryField } from "components/CategoryField";
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
import { ClassKind, classKinds } from "./context";
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
  const catalog = useCategoryCatalog();

  const kindName = CLASS_KIND_NAMES[kind];
  const idPrefix = useId();

  // Only a parameter class is identified by a category and an identifier
  // together.
  const categorized = kind === classKinds.PARAMETER;

  const [newCategory, setNewCategory] = useState<FullCategoryId>("");
  const [newId, setNewId] = useState(getUniqueItemId(takenIds));
  const [newName, setNewName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setNewCategory("");
      setNewId(getUniqueItemId(takenIds));
      setNewName("");
    }
  }, [isOpen]);

  // The standard requires identifiers to be unique within their category, so
  // only the siblings in the same category are checked for uniqueness.
  const siblingIdentifiers = takenIds
    .map((taken) =>
      categorized
        ? splitParameterClassId(taken)
        : { category: "", identifier: taken },
    )
    .filter((parts) => parts.category === newCategory)
    .map((parts) => parts.identifier);

  const idIsValid =
    validateNewItemId(newId, siblingIdentifiers).isValid &&
    (!categorized || newCategory !== "");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New {kindName}</DialogTitle>
          <DialogDescription>
            {categorized
              ? `Create a new ${kindName.toLowerCase()} by providing a category, an ID and a name`
              : `Create a new ${kindName.toLowerCase()} by providing an ID and a name`}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {categorized && (
            <FieldSet>
              <Label htmlFor={`${idPrefix}-category`}>Category</Label>
              <CategoryField
                id={`${idPrefix}-category`}
                value={newCategory}
                catalog={catalog}
                locale={locale}
                onValueChange={setNewCategory}
              />
            </FieldSet>
          )}
          <FieldSet>
            <Label htmlFor={`${idPrefix}-id`}>ID</Label>
            <ValidatedInput
              id={`${idPrefix}-id`}
              value={newId}
              onConfirm={setNewId}
              validator={(input) =>
                validateNewItemId(input, siblingIdentifiers)
              }
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
                CodexId(joinParameterClassId(newCategory, newId)),
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

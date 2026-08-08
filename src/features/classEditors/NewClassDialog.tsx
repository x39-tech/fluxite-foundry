import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useEffect, useId, useState } from "react";
import { CheckIcon } from "lucide-react";
import { useLingui } from "@lingui/react";
import { CodexId } from "app/persistentState";
import { useAuthoringLocale } from "app/store";
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
import { useClassCodexIds, useClassOperations } from "./state";
import { CLASS_KIND_MESSAGES } from "./messages";

const ADD_LABEL = msg({ id: "itemClasses.new.addLabel", message: "Add" });
const DEFAULTS_TO_ID = msg({
  id: "itemClasses.new.namePlaceholder",
  message: "Defaults to the ID",
});
const CANCEL_LABEL = msg({
  id: "itemClasses.new.cancelLabel",
  message: "Cancel",
});

interface Props {
  kind: ClassKind;
  isOpen: boolean;
  onClose: () => void;
}

export const NewClassDialog = ({ kind, isOpen, onClose }: Props) => {
  const takenIds = useClassCodexIds(kind);
  const operations = useClassOperations();
  const locale = useAuthoringLocale();
  const catalog = useCategoryCatalog();
  const { _ } = useLingui();

  const messages = CLASS_KIND_MESSAGES[kind];
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
          <DialogTitle>{_(messages.newDialogTitle)}</DialogTitle>
          <DialogDescription>
            {_(messages.newDialogDescription)}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {categorized && (
            <FieldSet>
              <Label htmlFor={`${idPrefix}-category`}>
                <Trans id="itemClasses.new.category">Category</Trans>
              </Label>
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
            <Label htmlFor={`${idPrefix}-id`}>
              <Trans id="itemClasses.new.id">ID</Trans>
            </Label>
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
            <Label htmlFor={`${idPrefix}-name`}>
              <Trans id="itemClasses.new.name">Name</Trans>
            </Label>
            <ValidatedInput
              id={`${idPrefix}-name`}
              value={newName}
              placeholder={_(DEFAULTS_TO_ID)}
              onConfirm={setNewName}
            />
          </FieldSet>
        </div>
        <DialogFooter>
          <Button
            aria-label={_(ADD_LABEL)}
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
            <Trans id="itemClasses.new.add">Add</Trans>
          </Button>
          <Button
            variant="secondary"
            aria-label={_(CANCEL_LABEL)}
            onClick={onClose}
          >
            <Trans id="itemClasses.new.cancel">Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useId, useState } from "react";
import { CheckIcon } from "lucide-react";
import { useAuthoringLocale, useLibraryStore } from "app/store";
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
import { useDeviceLocalLibrary } from "../state";
import { createNewCommand, useCommandCodexIds } from "./state";
import { CommandClassDisplay } from "./CommandClassDisplay";
import { lookupCommandClass } from "../stateTransformations";

const MESSAGES = {
  add: msg({ id: "deviceClassEditor.newCommand.add", message: "Add" }),
  cancel: msg({
    id: "deviceClassEditor.newCommand.cancel",
    message: "Cancel",
  }),
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewCommandDialog = ({ isOpen, onClose }: Props) => {
  const { _ } = useLingui();

  const libraryStore = useLibraryStore();
  const localLibrary = useDeviceLocalLibrary();
  const commandCodexIds = useCommandCodexIds();
  const locale = useAuthoringLocale();

  const classSelectorId = useId();
  const idId = useId();
  const friendlyNameId = useId();

  const [newItemClass, setNewItemClass] = useState<
    SelectedItemClass | undefined
  >(undefined);
  const [newItemId, setNewItemId] = useState(getUniqueItemId(commandCodexIds));
  // TODO: suitable default in the authoring locale?
  // eslint-disable-next-line lingui/no-unlocalized-strings
  const [newItemFriendlyName, setNewItemFriendlyName] = useState("My New Item");

  // Flush relevant parts of the state when the dialog was just opened
  useEffect(() => {
    if (isOpen) {
      setNewItemId(getUniqueItemId(commandCodexIds));
      // eslint-disable-next-line lingui/no-unlocalized-strings
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
          <DialogTitle>
            <Trans id="deviceClassEditor.newCommand.newCommand">
              New Command
            </Trans>
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldSet>
            <Label htmlFor={classSelectorId}>
              <Trans id="deviceClassEditor.newCommand.class">Class</Trans>
            </Label>
            <ItemClassSelector
              id={classSelectorId}
              selectedClass={newItemClass}
              kind="commandClasses"
              onSelectedClassChanged={setNewItemClass}
              tooltipRenderer={renderItemClassTooltip}
              libraryStore={libraryStore}
              localLibrary={localLibrary}
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={idId}>
              <Trans id="deviceClassEditor.newCommand.id">ID</Trans>
            </Label>
            <ValidatedInput
              id={idId}
              value={newItemId}
              onConfirm={setNewItemId}
              validator={(input) => validateNewItemId(input, commandCodexIds)}
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={friendlyNameId}>
              <Trans id="deviceClassEditor.newCommand.displayName">
                Display Name
              </Trans>
            </Label>
            <ValidatedInput
              id={friendlyNameId}
              value={newItemFriendlyName}
              onConfirm={setNewItemFriendlyName}
            />
          </FieldSet>
        </div>
        <DialogFooter>
          <Button
            aria-label={_(MESSAGES.add)}
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
            <Trans id="deviceClassEditor.newCommand.add">Add</Trans>
          </Button>
          <Button
            variant="secondary"
            aria-label={_(MESSAGES.cancel)}
            onClick={onClose}
          >
            <Trans id="deviceClassEditor.newCommand.cancel">Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "components/scn-ui/Button";
import { TextEditorTableRow } from "components/EditorFields/DeprecatedTextEditorField";
import { SimplePropsTable } from "components/SimplePropsTable";
import {
  ItemClassSelector,
  SelectedItemClass,
} from "components/ItemClassSelector";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { ParameterClassDisplay } from "./ParameterClassDisplay";
import { validateNewItemId } from "utils/inputValidation";
import { useAuthoringLocale, useLibraryStore } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { useDeviceLocalLibrary } from "../state";
import { createNewParameter, useParameterCodexIds } from "./state";
import { lookupParameterClass } from "../stateTransformations";
import { CodexId } from "app/persistentState";

const MESSAGES = {
  id: msg({ id: "deviceClassEditor.newParameter.id", message: "ID" }),
  add: msg({ id: "deviceClassEditor.newParameter.add", message: "Add" }),
  cancel: msg({
    id: "deviceClassEditor.newParameter.cancel",
    message: "Cancel",
  }),
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewParameterDialog = ({ isOpen, onClose }: Props) => {
  const { _ } = useLingui();

  const libraryStore = useLibraryStore();
  const localLibrary = useDeviceLocalLibrary();
  const parameterIds = useParameterCodexIds();
  const locale = useAuthoringLocale();

  const [newItemClass, setNewItemClass] = useState<
    SelectedItemClass | undefined
  >(undefined);
  const [newItemId, setNewItemId] = useState(getUniqueItemId(parameterIds));

  // Flush relevant parts of the state when the dialog was just opened
  useEffect(() => {
    if (isOpen) {
      setNewItemId(getUniqueItemId(parameterIds));
    }
  }, [isOpen]);

  const renderItemClassTooltip = (item: SelectedItemClass) => {
    const resolvedClass = lookupParameterClass(item.resolved, locale);
    return <ParameterClassDisplay paramClass={resolvedClass!} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans id="deviceClassEditor.newParameter.dialogTitle">
              New Parameter
            </Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="deviceClassEditor.newParameter.dialogDescription">
              Create a new parameter by selecting a class and providing an ID
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col">
          <SimplePropsTable>
            <tr>
              <td id="class-label">
                <Trans id="deviceClassEditor.newParameter.class">Class</Trans>
              </td>
              <td>
                <ItemClassSelector
                  selectedClass={newItemClass}
                  aria-labelledby="class-label"
                  kind="parameterClasses"
                  onSelectedClassChanged={setNewItemClass}
                  tooltipRenderer={renderItemClassTooltip}
                  libraryStore={libraryStore}
                  localLibrary={localLibrary}
                />
              </td>
            </tr>
            <TextEditorTableRow
              label={_(MESSAGES.id)}
              value={newItemId}
              onValueChanged={setNewItemId}
              validator={(input) => validateNewItemId(input, parameterIds)}
              validationErrorPlacement="right"
            />
          </SimplePropsTable>
        </div>
        <DialogFooter>
          <Button
            aria-label={_(MESSAGES.add)}
            disabled={!newItemClass}
            onClick={() => {
              if (newItemClass) {
                createNewParameter(
                  newItemClass.libraryId,
                  newItemClass.codexId,
                  CodexId(newItemId),
                );
              }

              onClose();
            }}
          >
            <CheckIcon />
            <Trans id="deviceClassEditor.newParameter.add">Add</Trans>
          </Button>
          <Button
            variant="secondary"
            aria-label={_(MESSAGES.cancel)}
            onClick={onClose}
          >
            <Trans id="deviceClassEditor.newParameter.cancel">Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

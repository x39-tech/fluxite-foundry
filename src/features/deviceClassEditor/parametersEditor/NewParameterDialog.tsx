import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-react";
import { Button } from "components/scn-ui/Button";
import { TextEditorTableRow } from "components/EditorFields/DeprecatedTextEditorField";
import { SimplePropsTable } from "components/SimplePropsTable";
import { ItemClassSelector } from "components/ItemClassSelector";
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
import { useCurrentLocale, useCodexDatabase } from "app/store";
import { getUniqueItemId } from "utils/utils";
import { createNewParameter, useParameterCodexIds } from "./state";
import { lookupParameterClass } from "../stateTransformations";
import { ItemClassWithId } from "codex/codexDatabase";
import { CodexId } from "app/persistentState";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const NewParameterDialog = ({ isOpen, onClose }: Props) => {
  const database = useCodexDatabase();
  const parameterIds = useParameterCodexIds();
  const locale = useCurrentLocale();

  const [newItemClass, setNewItemClass] = useState<ItemClassWithId | undefined>(
    undefined,
  );
  const [newItemId, setNewItemId] = useState(getUniqueItemId(parameterIds));

  // Flush relevant parts of the state when the dialog was just opened
  useEffect(() => {
    if (isOpen) {
      setNewItemId(getUniqueItemId(parameterIds));
    }
  }, [isOpen]);

  const renderItemClassTooltip = (item: ItemClassWithId) => {
    if (item.type === "local") {
      // TODO: handle
      return <></>;
    }

    const resolvedClass = lookupParameterClass(
      database,
      item.codexId,
      item.libraryId,
      item.libraryVersion,
      locale,
    );
    return <ParameterClassDisplay paramClass={resolvedClass!} />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Parameter</DialogTitle>
          <DialogDescription>
            Create a new parameter by selecting a class and providing an ID
          </DialogDescription>
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
          </SimplePropsTable>
        </div>
        <DialogFooter>
          <Button
            aria-label="Add"
            disabled={!newItemClass}
            onClick={() => {
              if (newItemClass) {
                createNewParameter(
                  newItemClass.type === "imported"
                    ? newItemClass.libraryId
                    : undefined,
                  newItemClass.codexId,
                  CodexId(newItemId),
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

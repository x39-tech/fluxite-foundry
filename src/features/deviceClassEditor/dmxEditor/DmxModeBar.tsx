import { useId } from "react";
import { Trans } from "@lingui/react/macro";
import { CopyIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { CodexId, EntityId } from "app/persistentState";
import { FieldSet } from "components/FieldSet";
import { ValidatedInput } from "components/ValidatedInput";
import { SelectField } from "components/EditorFields/SelectField";
import { Button } from "components/scn-ui/Button";
import { Label } from "components/scn-ui/Label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "components/scn-ui/AlertDialog";
import { validateNewItemId } from "utils/inputValidation";
import {
  addDmxMode,
  changeDmxModeCodexId,
  deleteDmxMode,
  DmxMode,
  duplicateDmxMode,
  selectTabDmxSerializer,
  useDmxModes,
} from "./state";

interface Props {
  tabId: string;
  // The mode the tab is editing.
  serializerId: EntityId | undefined;
}

/** Picks the mode a DMX editor tab is editing. Also adds, renames and deletes modes. */
export const DmxModeBar = ({ tabId, serializerId }: Props) => {
  const idPrefix = useId();
  const modes = useDmxModes();
  const edited = modes.find((mode) => mode.id === serializerId);

  return (
    <div className="flex flex-wrap items-end gap-4 border-b px-4 py-3">
      {edited && (
        <>
          <FieldSet>
            <Label htmlFor={`${idPrefix}-mode`}>
              <Trans id="deviceClassEditor.dmxModeBar.mode">Mode</Trans>
            </Label>
            <SelectField
              id={`${idPrefix}-mode`}
              className="w-3xs"
              size="sm"
              values={modes.map((mode) => mode.id)}
              displayValues={modes.map((mode) => mode.codexId)}
              selectedValue={edited.id}
              onSelectionChanged={(id) =>
                selectTabDmxSerializer(tabId, EntityId(id))
              }
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={`${idPrefix}-modeId`}>
              <Trans id="deviceClassEditor.dmxModeBar.modeId">Mode ID</Trans>
            </Label>
            <ValidatedInput
              key={edited.id}
              id={`${idPrefix}-modeId`}
              className="h-8 w-3xs"
              value={edited.codexId}
              onConfirm={(newValue) =>
                changeDmxModeCodexId(edited.id, CodexId(newValue))
              }
              validator={(input) =>
                validateNewItemId(
                  input,
                  modes
                    .filter((mode) => mode.id !== edited.id)
                    .map((mode) => mode.codexId),
                )
              }
            />
          </FieldSet>
        </>
      )}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => addDmxMode(tabId)}>
          <PlusIcon />
          <Trans id="deviceClassEditor.dmxModeBar.add">Add Mode</Trans>
        </Button>
        {edited && (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={() => duplicateDmxMode(edited.id, tabId)}
            >
              <CopyIcon />
              <Trans id="deviceClassEditor.dmxModeBar.duplicate">
                Duplicate Mode
              </Trans>
            </Button>
            <DeleteModeButton mode={edited} />
          </>
        )}
      </div>
    </div>
  );
};

// Deletes a mode after prompting for confirmation.
const DeleteModeButton = ({ mode }: { mode: DmxMode }) => {
  const codexId = mode.codexId;

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Trash2Icon />
          <Trans id="deviceClassEditor.dmxModeBar.delete">Delete Mode</Trans>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            <Trans id="deviceClassEditor.dmxModeBar.deleteConfirm.title">
              Delete Mode?
            </Trans>
          </AlertDialogTitle>
          <AlertDialogDescription>
            <Trans id="deviceClassEditor.dmxModeBar.deleteConfirm.description">
              The mode “{codexId}” will be deleted, along with its slot groups
              and parameter mappings.
            </Trans>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>
            <Trans id="deviceClassEditor.dmxModeBar.deleteConfirm.cancel">
              Cancel
            </Trans>
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={() => deleteDmxMode(mode.id)}
          >
            <Trans id="deviceClassEditor.dmxModeBar.deleteConfirm.confirm">
              Delete Mode
            </Trans>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

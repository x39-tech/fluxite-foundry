import { capitalCase } from "change-case";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { PlusIcon } from "lucide-react";
import { Access, accesses, Lifetime, lifetimes } from "app/persistentState";
import {
  ListItemsEditor,
  ListItemsEditorLabels,
} from "components/ListItemsEditor";
import { Button } from "components/scn-ui/Button";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { SelectField } from "components/EditorFields/SelectField";
import { EmitterGroupEditor } from "./EmitterGroupEditor";
import {
  addEmitterGroup,
  createEmittersStructure,
  deleteEmitterGroup,
  deleteEmittersStructure,
  setEmittersStructureAccess,
  setEmittersStructureLifetime,
  useEmitterGroupEditors,
  useEmittersStructure,
} from "./state";

const LABELS: ListItemsEditorLabels = {
  add: msg({
    id: "deviceClassEditor.emitters.list.add",
    message: "Add Emitter Group",
  }),
  delete: msg({
    id: "deviceClassEditor.emitters.list.delete",
    message: "Delete Emitter Group",
  }),
  search: msg({
    id: "deviceClassEditor.emitters.list.search",
    message: "Search Emitter Groups",
  }),
  emptyState: msg({
    id: "deviceClassEditor.emitters.list.emptyState",
    message: "Add an emitter group to start editing",
  }),
  selectPrompt: msg({
    id: "deviceClassEditor.emitters.list.selectPrompt",
    message: "Select an emitter group to start editing",
  }),
};

export const EmittersEditor = () => {
  const structure = useEmittersStructure();
  const groupEditors = useEmitterGroupEditors();

  if (!structure) {
    return <EmptyState />;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex flex-wrap items-end gap-4 border-b px-6 py-3">
        <FieldSet>
          <Label>
            <Trans id="deviceClassEditor.emitters.access">Access</Trans>
          </Label>
          <div className="flex h-9 items-center gap-4">
            <LabeledCheckbox
              checked={structure.access.includes(accesses.READ)}
              onChange={(checked) =>
                setEmittersStructureAccess(
                  toggled(structure.access, accesses.READ, checked),
                )
              }
            >
              <Trans id="deviceClassEditor.emitters.read">Read</Trans>
            </LabeledCheckbox>
            <LabeledCheckbox
              disabled={structure.lifetime === lifetimes.STATIC}
              checked={structure.access.includes(accesses.WRITE)}
              onChange={(checked) =>
                setEmittersStructureAccess(
                  toggled(structure.access, accesses.WRITE, checked),
                )
              }
            >
              <Trans id="deviceClassEditor.emitters.write">Write</Trans>
            </LabeledCheckbox>
          </div>
        </FieldSet>
        <FieldSet>
          <Label>
            <Trans id="deviceClassEditor.emitters.lifetime">Lifetime</Trans>
          </Label>
          <SelectField
            values={Object.values(lifetimes)}
            displayValues={Object.values(lifetimes).map((value) =>
              capitalCase(value),
            )}
            selectedValue={structure.lifetime}
            onSelectionChanged={(newValue) =>
              setEmittersStructureLifetime(newValue as Lifetime)
            }
          />
        </FieldSet>
        <div className="ml-auto">
          <Button variant="secondary" onClick={deleteEmittersStructure}>
            <Trans id="deviceClassEditor.emitters.deleteStructure">
              Remove Emitters Structure
            </Trans>
          </Button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <ListItemsEditor
          editors={groupEditors}
          labels={LABELS}
          getEditorTitle={(editor) => editor.codexId}
          onAddItem={addEmitterGroup}
          onDeleteItem={(editor) => deleteEmitterGroup(editor.id)}
          renderActiveEditor={(editor) => (
            <EmitterGroupEditor id={editor.id} codexId={editor.codexId} />
          )}
        />
      </div>
    </div>
  );
};

const EmptyState = () => (
  <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
    <p className="max-w-md text-muted-foreground">
      <Trans id="deviceClassEditor.emitters.noStructure">
        This device class has no Emitters structure. Add one to describe the
        light emitters the device has, their colours and their spectra.
      </Trans>
    </p>
    <Button onClick={createEmittersStructure}>
      <PlusIcon />
      <Trans id="deviceClassEditor.emitters.createStructure">
        Add Emitters Structure
      </Trans>
    </Button>
  </div>
);

function toggled(access: Access[], value: Access, checked: boolean): Access[] {
  if (checked) {
    return access.includes(value) ? access : [...access, value];
  }
  return access.filter((existing) => existing !== value);
}

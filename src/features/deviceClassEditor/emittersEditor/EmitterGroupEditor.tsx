import { useId } from "react";
import { Trans } from "@lingui/react/macro";
import { PlusIcon, TriangleAlertIcon } from "lucide-react";
import { CodexId, EntityId } from "app/persistentState";
import { validateNewItemId } from "utils/inputValidation";
import { Button } from "components/scn-ui/Button";
import { Alert, AlertDescription, AlertTitle } from "components/scn-ui/Alert";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { EmitterEditor } from "./EmitterEditor";
import {
  addEmitter,
  setEmitterGroupCodexId,
  useEmitterGroupCodexIds,
  useEmittersOfGroup,
} from "./state";

interface Props {
  id: EntityId;
  codexId: CodexId;
}

export const EmitterGroupEditor = ({ id, codexId }: Props) => {
  const idPrefix = useId();
  const emitters = useEmittersOfGroup(id);
  const groupCodexIds = useEmitterGroupCodexIds();

  const siblingCodexIds = emitters.map((emitter) => emitter.codexId as string);

  // Table 8-9: a group's emitters are measured relative to one of them, so
  // exactly one has to sit at 1.0.
  const fullBrightnessCount = emitters.filter(
    (emitter) => emitter.relativeBrightness === 1,
  ).length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>
            <Trans id="deviceClassEditor.emitters.group.id">ID</Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={codexId}
            onConfirm={(newValue) =>
              setEmitterGroupCodexId(id, CodexId(newValue))
            }
            validator={(input) =>
              validateNewItemId(
                input,
                groupCodexIds.filter((value) => value !== codexId),
              )
            }
          />
        </FieldSet>
      </div>

      {emitters.length > 0 && fullBrightnessCount !== 1 && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>
            {fullBrightnessCount === 0 ? (
              <Trans id="deviceClassEditor.emitters.group.noFullBrightness">
                No emitter in this group is at full relative brightness.
              </Trans>
            ) : (
              <Trans id="deviceClassEditor.emitters.group.manyFullBrightness">
                {fullBrightnessCount} emitters in this group are at full
                relative brightness.
              </Trans>
            )}
          </AlertTitle>
          <AlertDescription>
            <Trans id="deviceClassEditor.emitters.group.fullBrightnessDesc">
              Relative brightness is measured against the brightest emitter, so
              exactly one emitter in the group has to be 1.
            </Trans>
          </AlertDescription>
        </Alert>
      )}

      {emitters.map((emitter) => (
        <EmitterEditor
          key={emitter.id}
          groupId={id}
          emitter={emitter}
          siblingCodexIds={siblingCodexIds}
        />
      ))}

      <div>
        <Button onClick={() => addEmitter(id)}>
          <PlusIcon />
          <Trans id="deviceClassEditor.emitters.group.addEmitter">
            Add Emitter
          </Trans>
        </Button>
      </div>
    </div>
  );
};

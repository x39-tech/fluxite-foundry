import { useId } from "react";
import { MessageDescriptor } from "@lingui/core";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trash2Icon } from "lucide-react";
import { CodexId, EmitterCommonColor, EntityId } from "app/persistentState";
import { EMITTER_PARAM_CLASS_CODEX_ID } from "codex/codex";
import { validateNewItemId } from "utils/inputValidation";
import { Button } from "components/scn-ui/Button";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { ValidatedInput } from "components/ValidatedInput";
import { StringSelector } from "components/StringSelector";
import { useParametersOfClass } from "../state";
import { COMMON_COLOR_NAMES, NO_COMMON_COLOR, NO_PARAMETER } from "./labels";
import { SpdSection } from "./SpdSection";
import {
  deleteEmitter,
  EmitterWithId,
  setEmitterCodexId,
  setEmitterCommonColor,
  setEmitterDirectControl,
  setEmitterRelativeBrightness,
} from "./state";

const MESSAGES = {
  delete: msg({
    id: "deviceClassEditor.emitters.emitter.delete",
    message: "Delete Emitter",
  }),
};

interface Props {
  groupId: EntityId;
  emitter: EmitterWithId;
  siblingCodexIds: string[];
}

export const EmitterEditor = ({ groupId, emitter, siblingCodexIds }: Props) => {
  const { _ } = useLingui();
  const idPrefix = useId();
  const emitterParameters = useParametersOfClass(EMITTER_PARAM_CLASS_CODEX_ID);

  const parameterCodexIds = emitterParameters.map(
    (candidate) => candidate.parameter.codexId as string,
  );
  const parameterItems = [_(NO_PARAMETER), ...parameterCodexIds];
  const selectedParameter = parameterNameOf(
    emitter.directControl?.id,
    emitterParameters,
  );

  const colorItems = [
    _(NO_COMMON_COLOR),
    ...COMMON_COLOR_NAMES.map(({ name }) => _(name)),
  ];
  const selectedColor = emitter.commonColor
    ? _(
        COMMON_COLOR_NAMES.find(({ color }) => color === emitter.commonColor)!
          .name,
      )
    : _(NO_COMMON_COLOR);

  return (
    <section className="flex flex-col gap-4 rounded-lg border px-4 py-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-lg font-semibold">{emitter.codexId}</h3>
        <Button
          size="icon"
          variant="ghost"
          aria-label={_(MESSAGES.delete)}
          onClick={() => deleteEmitter(groupId, emitter.id)}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-id`}>
            <Trans id="deviceClassEditor.emitters.emitter.id">ID</Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-id`}
            value={emitter.codexId}
            onConfirm={(newValue) =>
              setEmitterCodexId(emitter.id, CodexId(newValue))
            }
            validator={(input) =>
              validateNewItemId(
                input,
                siblingCodexIds.filter((value) => value !== emitter.codexId),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-commonColor`}>
            <Trans id="deviceClassEditor.emitters.emitter.commonColor">
              Common Colour
            </Trans>
          </Label>
          <StringSelector
            items={colorItems}
            selectedItem={selectedColor}
            onSelectedItemChanged={(newValue) =>
              setEmitterCommonColor(emitter.id, commonColorOf(newValue, _))
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-relativeBrightness`}>
            <Trans id="deviceClassEditor.emitters.emitter.relativeBrightness">
              Relative Brightness
            </Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-relativeBrightness`}
            value={
              emitter.relativeBrightness === undefined
                ? ""
                : String(emitter.relativeBrightness)
            }
            onConfirm={(newValue) =>
              setEmitterRelativeBrightness(
                emitter.id,
                newValue.trim() === "" ? undefined : Number(newValue),
              )
            }
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-directControl`}>
            <Trans id="deviceClassEditor.emitters.emitter.directControl">
              Direct Control Parameter
            </Trans>
          </Label>
          <StringSelector
            items={parameterItems}
            selectedItem={selectedParameter ?? _(NO_PARAMETER)}
            onSelectedItemChanged={(newValue) => {
              const chosen = emitterParameters.find(
                (candidate) => candidate.parameter.codexId === newValue,
              );
              setEmitterDirectControl(
                emitter.id,
                chosen ? { id: chosen.id } : undefined,
              );
            }}
          />
        </FieldSet>
      </div>

      <SpdSection emitterId={emitter.id} spd={emitter.spd} />
    </section>
  );
};

function parameterNameOf(
  id: EntityId | undefined,
  candidates: { id: EntityId; parameter: { codexId: CodexId } }[],
): string | undefined {
  if (id === undefined) return undefined;
  return candidates.find((candidate) => candidate.id === id)?.parameter.codexId;
}

function commonColorOf(
  displayName: string,
  translate: (descriptor: MessageDescriptor) => string,
): EmitterCommonColor | undefined {
  return COMMON_COLOR_NAMES.find(({ name }) => translate(name) === displayName)
    ?.color;
}

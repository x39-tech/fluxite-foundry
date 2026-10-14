import { useId, useState } from "react";
import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { PlusIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { EntityId, Spd } from "app/persistentState";
import { Button } from "components/scn-ui/Button";
import { Alert, AlertDescription, AlertTitle } from "components/scn-ui/Alert";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { ValidatedInput } from "components/ValidatedInput";
import { validateStringIsNumber } from "utils/inputValidation";
import { SpdGraph } from "./SpdGraph";
import { SpdImportDialog } from "./SpdImportDialog";
import { spdLengthMismatches, spdSampleCount } from "./spd";
import {
  addSpd,
  addSpdMappings,
  deleteSpd,
  removeSpdMapping,
  setSpdGrid,
  setSpdStorage,
  useSpdResourceCodexId,
} from "./state";

const MESSAGES = {
  removeCurve: msg({
    id: "deviceClassEditor.emitters.spd.removeCurve",
    message: "Remove Curve",
  }),
};

interface Props {
  emitterId: EntityId;
  spd: Spd | undefined;
}

export const SpdSection = ({ emitterId, spd }: Props) => {
  const { _ } = useLingui();
  const idPrefix = useId();
  const [importDialogIsOpen, setImportDialogIsOpen] = useState(false);
  const resourceCodexId = useSpdResourceCodexId(spd);

  if (!spd) {
    return (
      <div className="flex flex-col gap-2">
        <SectionHeading />
        <p className="text-sm text-muted-foreground">
          <Trans id="deviceClassEditor.emitters.spd.none">
            This emitter has no spectral power distribution.
          </Trans>
        </p>
        <div>
          <Button variant="secondary" onClick={() => addSpd(emitterId)}>
            <PlusIcon />
            <Trans id="deviceClassEditor.emitters.spd.add">
              Add Spectral Power Distribution
            </Trans>
          </Button>
        </div>
      </div>
    );
  }

  const mismatches = spdLengthMismatches(spd);
  const sampleCount = spdSampleCount(spd);

  return (
    <div className="flex flex-col gap-3">
      <SectionHeading />

      {mismatches.length > 0 && (
        <Alert variant="destructive">
          <TriangleAlertIcon />
          <AlertTitle>
            <Trans id="deviceClassEditor.emitters.spd.lengthMismatch">
              The curves of this distribution are different lengths.
            </Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans id="deviceClassEditor.emitters.spd.lengthMismatchDesc">
              Every curve and deviation has to hold {sampleCount} samples, to
              match the first one. Remove the curves that do not and import them
              again.
            </Trans>
          </AlertDescription>
        </Alert>
      )}

      {spd.mappings.length === 0 && (
        <Alert>
          <TriangleAlertIcon />
          <AlertTitle>
            <Trans id="deviceClassEditor.emitters.spd.empty">
              This distribution has no curves in it.
            </Trans>
          </AlertTitle>
          <AlertDescription>
            <Trans id="deviceClassEditor.emitters.spd.emptyDesc">
              Import a file to fill it in. A distribution imported from a
              document whose resource file was missing arrives empty too.
            </Trans>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <FieldSet>
          <Label htmlFor={`${idPrefix}-start`}>
            <Trans id="deviceClassEditor.emitters.spd.start">
              First Wavelength (nm)
            </Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-start`}
            value={String(spd.start)}
            onConfirm={(newValue) =>
              setSpdGrid(emitterId, { start: Number(newValue) })
            }
            validator={validateStringIsNumber}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-step`}>
            <Trans id="deviceClassEditor.emitters.spd.step">Step (nm)</Trans>
          </Label>
          <ValidatedInput
            id={`${idPrefix}-step`}
            value={String(spd.step)}
            onConfirm={(newValue) =>
              setSpdGrid(emitterId, { step: Number(newValue) })
            }
            validator={validateStringIsNumber}
          />
        </FieldSet>
        <FieldSet>
          <Label htmlFor={`${idPrefix}-storage`}>
            <Trans id="deviceClassEditor.emitters.spd.storage">Storage</Trans>
          </Label>
          <div id={`${idPrefix}-storage`} className="flex h-9 items-center">
            <LabeledCheckbox
              checked={spd.storage.type === "resource"}
              onChange={(checked) => setSpdStorage(emitterId, checked)}
            >
              <Trans id="deviceClassEditor.emitters.spd.asResource">
                Store in a resource file
              </Trans>
            </LabeledCheckbox>
          </div>
        </FieldSet>
      </div>

      {spd.storage.type === "resource" && (
        <p className="text-sm text-muted-foreground">
          {resourceCodexId ? (
            <Trans id="deviceClassEditor.emitters.spd.resourceName">
              The samples are exported to the resource{" "}
              <code>{resourceCodexId}</code>. Clear the checkbox to write them
              into the device class document instead.
            </Trans>
          ) : (
            <Trans id="deviceClassEditor.emitters.spd.resourceMissing">
              The resource holding these samples no longer exists. Clear the
              checkbox and set it again to make a new one.
            </Trans>
          )}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label>
          <Trans id="deviceClassEditor.emitters.spd.curves">Curves</Trans>
        </Label>
        {spd.mappings.map((mapping, index) => {
          const value = mapping.value;
          const samples = mapping.powerDistribution.length;

          return (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm">
                <Trans id="deviceClassEditor.emitters.spd.curveAtValue">
                  At parameter value {value}: {samples} samples
                </Trans>
              </span>
              <Button
                size="icon"
                variant="ghost"
                aria-label={_(MESSAGES.removeCurve)}
                onClick={() => removeSpdMapping(emitterId, index)}
              >
                <XIcon className="size-4" />
              </Button>
            </div>
          );
        })}
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setImportDialogIsOpen(true)}
          >
            <PlusIcon />
            <Trans id="deviceClassEditor.emitters.spd.importCurve">
              Import Curve
            </Trans>
          </Button>
          <Button variant="secondary" onClick={() => deleteSpd(emitterId)}>
            <Trans id="deviceClassEditor.emitters.spd.remove">
              Remove Distribution
            </Trans>
          </Button>
        </div>
      </div>

      <SpdGraph spd={spd} />

      <SpdImportDialog
        isOpen={importDialogIsOpen}
        spd={spd}
        onClose={() => setImportDialogIsOpen(false)}
        onImported={(samples) => addSpdMappings(emitterId, samples)}
      />
    </div>
  );
};

const SectionHeading = () => (
  <h4 className="font-medium">
    <Trans id="deviceClassEditor.emitters.spd.heading">
      Spectral Power Distribution
    </Trans>
  </h4>
);

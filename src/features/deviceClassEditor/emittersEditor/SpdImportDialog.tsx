import { useEffect, useId, useState } from "react";
import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { CheckIcon, TriangleAlertIcon } from "lucide-react";
import { Spd } from "app/persistentState";
import { errorMessage } from "utils/utils";
import { Button } from "components/scn-ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { Alert, AlertDescription } from "components/scn-ui/Alert";
import { FieldSet } from "components/FieldSet";
import { Label } from "components/scn-ui/Label";
import { Input } from "components/scn-ui/Input";
import { ValidatedInput } from "components/ValidatedInput";
import { validateStringIsNumber } from "utils/inputValidation";
import { SpdSamples, spdSampleCount } from "./spd";
import { parseSpdFile, SpdGrid } from "./spdImport";

const MESSAGES = {
  readFailed: msg({
    id: "deviceClassEditor.emitters.spdImport.readFailed",
    message: "The file could not be read: {reason}",
  }),
  noFile: msg({
    id: "deviceClassEditor.emitters.spdImport.noFile",
    message: "Choose a file to import.",
  }),
  import: msg({
    id: "deviceClassEditor.emitters.spdImport.import",
    message: "Import",
  }),
  cancel: msg({
    id: "deviceClassEditor.emitters.spdImport.cancel",
    message: "Cancel",
  }),
  file: msg({
    id: "deviceClassEditor.emitters.spdImport.file",
    message: "File",
  }),
};

interface Props {
  isOpen: boolean;
  /** The SPD being added to, which fixes the grid an import has to land on. */
  spd: Spd;
  onClose: () => void;
  onImported: (samples: SpdSamples) => void;
}

export const SpdImportDialog = ({
  isOpen,
  spd,
  onClose,
  onImported,
}: Props) => {
  const { _ } = useLingui();
  const idPrefix = useId();

  const sampleCount = spdSampleCount(spd);
  const grid: SpdGrid | undefined =
    sampleCount === undefined
      ? undefined
      : { start: spd.start, step: spd.step, sampleCount };

  const [file, setFile] = useState<File | undefined>(undefined);
  const [start, setStart] = useState(String(spd.start));
  const [step, setStep] = useState(String(spd.step));
  // §8.1.1.3 requires a curve at the parameter's unit value, so that is what
  // the first import defaults to.
  const [value, setValue] = useState(spd.mappings.length === 0 ? "1" : "");
  const [error, setError] = useState<MessageDescriptor | undefined>(undefined);

  useEffect(() => {
    if (!isOpen) return;
    setFile(undefined);
    setError(undefined);
    setStart(String(spd.start));
    setStep(String(spd.step));
    setValue(spd.mappings.length === 0 ? "1" : "");
  }, [isOpen]);

  const runImport = async () => {
    if (!file) {
      setError(MESSAGES.noFile);
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch (e) {
      setError({
        ...MESSAGES.readFailed,
        values: { reason: errorMessage(e) },
      });
      return;
    }

    const result = parseSpdFile(text, {
      value: Number(value),
      start: Number(start),
      step: Number(step),
      grid,
      existingValues: spd.mappings.map((mapping) => mapping.value),
    });

    if (!result.ok) {
      setError(result.error);
      return;
    }

    onImported(result.samples);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans id="deviceClassEditor.emitters.spdImport.title">
              Import Spectral Power Distribution
            </Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="deviceClassEditor.emitters.spdImport.description">
              Import a curve from a CSV file of power values, a CSV file of
              wavelength and power columns, or a Fluxite Codex JSON file. Values
              are scaled so the peak reads 1.0.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <FieldSet>
            <Label htmlFor={`${idPrefix}-file`}>{_(MESSAGES.file)}</Label>
            <Input
              id={`${idPrefix}-file`}
              type="file"
              accept=".csv,.json,.txt,text/csv,application/json,text/plain"
              onChange={(event) => {
                setFile(event.target.files?.[0]);
                setError(undefined);
              }}
            />
          </FieldSet>
          <div className="flex flex-wrap gap-4">
            <FieldSet>
              <Label htmlFor={`${idPrefix}-value`}>
                <Trans id="deviceClassEditor.emitters.spdImport.value">
                  Parameter Value
                </Trans>
              </Label>
              <ValidatedInput
                id={`${idPrefix}-value`}
                value={value}
                onConfirm={setValue}
                validator={validateStringIsNumber}
              />
            </FieldSet>
            <FieldSet>
              <Label htmlFor={`${idPrefix}-start`}>
                <Trans id="deviceClassEditor.emitters.spdImport.start">
                  First Wavelength (nm)
                </Trans>
              </Label>
              <ValidatedInput
                id={`${idPrefix}-start`}
                value={start}
                disabled={grid !== undefined}
                onConfirm={setStart}
                validator={validateStringIsNumber}
              />
            </FieldSet>
            <FieldSet>
              <Label htmlFor={`${idPrefix}-step`}>
                <Trans id="deviceClassEditor.emitters.spdImport.step">
                  Step (nm)
                </Trans>
              </Label>
              <ValidatedInput
                id={`${idPrefix}-step`}
                value={step}
                disabled={grid !== undefined}
                onConfirm={setStep}
                validator={validateStringIsNumber}
              />
            </FieldSet>
          </div>
          <p className="text-sm text-muted-foreground">
            <Trans id="deviceClassEditor.emitters.spdImport.gridHelp">
              The first wavelength and step are only used for a file with no
              wavelength column. A file with two columns brings its own, and
              must be evenly spaced.
            </Trans>
          </p>
          {error && (
            <Alert variant="destructive">
              <TriangleAlertIcon />
              <AlertDescription>{_(error)}</AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button onClick={runImport}>
            <CheckIcon />
            {_(MESSAGES.import)}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            {_(MESSAGES.cancel)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

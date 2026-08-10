import { useState } from "react";
import { CircleAlertIcon, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import {
  Dialog,
  DialogFooter,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { Button } from "components/scn-ui/Button";
import { Textarea } from "components/scn-ui/Textarea";
import { Alert, AlertDescription, AlertTitle } from "components/scn-ui/Alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "components/scn-ui/Select";
import { Label } from "components/scn-ui/Label";
import { AppInput } from "components/AppInput";
import { FieldSet } from "components/FieldSet";
import { importDeviceClassEditor } from "features/deviceClassEditor/import";
import { errorMessage } from "utils/utils";
import { LocalizedError } from "utils/localizedError";
import { useAuthoringLocale } from "app/store";
import {
  validateInputFile,
  CodexImportResult,
  DeviceClassToImport,
  FeedbackKind,
  getDeviceClassFromArchive,
  getDeviceClassFromDocument,
} from "./importUtils";

const MESSAGES = {
  importFailed: msg({
    id: "navbar.importCodex.importFailed",
    message: "Error importing device class: {reason}",
  }),
  selectPlaceholder: msg({
    id: "navbar.importCodex.selectPlaceholder",
    message: "Select a device class...",
  }),
  noDeviceClassSelected: msg({
    id: "navbar.importCodex.noDeviceClassSelected",
    message: "No device class selected",
  }),
  loadFailed: msg({
    id: "navbar.importCodex.loadFailed",
    message: "Error loading device class",
  }),
  deviceClassWithVersion: msg({
    id: "navbar.importCodex.deviceClassWithVersion",
    message: "{id} ({version})",
  }),
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportFluxiteCodexDialog = ({ isOpen, onClose }: Props) => {
  const locale = useAuthoringLocale();
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputValidation, setInputValidation] = useState<
    CodexImportResult | undefined
  >(undefined);
  const [selectedDeviceClass, setSelectedDeviceClass] = useState(-1);
  const { _ } = useLingui();

  const deviceClasses = inputValidation?.deviceClasses || [];

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans id="navbar.importCodex.title">Import Fluxite Codex</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="navbar.importCodex.description">
              Import a device class from a Fluxite Codex archive or document
              file
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2">
          <FieldSet>
            <Label htmlFor="import-file">
              <Trans id="navbar.importCodex.selectFile">
                Select Fluxite Codex file to import
              </Trans>
            </Label>
            <AppInput
              id="import-file"
              type="file"
              accept=".fca,.fcd"
              onChange={(event) => {
                const file = event.currentTarget.files?.item(0) ?? null;
                setInputFile(file);

                if (file !== null) {
                  validateInputFile(file).then((value) => {
                    setInputValidation(value);
                    if (value.deviceClasses && value.deviceClasses.length > 0) {
                      setSelectedDeviceClass(0);
                    }
                  });
                }
              }}
            />
          </FieldSet>
          <AdditionalDialogElements
            inputFile={inputFile}
            inputValidation={inputValidation}
            deviceClasses={deviceClasses}
            selectedIdx={selectedDeviceClass}
            onSelectedIdxChange={setSelectedDeviceClass}
          />
        </div>
        <DialogFooter>
          <Button
            disabled={
              !inputValidation ||
              !inputValidation.valid ||
              deviceClasses.length == 0
            }
            onClick={async () => {
              if (inputFile) {
                try {
                  const deviceClass = deviceClasses[selectedDeviceClass];
                  if (!deviceClass) {
                    throw new LocalizedError(MESSAGES.noDeviceClassSelected);
                  }

                  // Get the device class definition from the archive
                  let deviceClassDefinition;
                  if (inputValidation?.archive) {
                    deviceClassDefinition = await getDeviceClassFromArchive(
                      inputFile,
                      deviceClass,
                    );
                  } else {
                    deviceClassDefinition = await getDeviceClassFromDocument(
                      inputFile,
                      deviceClass,
                    );
                  }

                  if (!deviceClassDefinition) {
                    throw new LocalizedError(MESSAGES.loadFailed);
                  }

                  // Import the device class
                  await importDeviceClassEditor(
                    deviceClass.orgId,
                    deviceClass.id,
                    deviceClass.version,
                    deviceClassDefinition,
                    // Fluxite Codex doesn't have an authored locale field (yet)
                    // so the best guess is the user's current locale. We intend
                    // to make this correctible in the app.
                    locale,
                    inputValidation?.archive
                      ? {
                          archive: inputValidation.archive,
                          archiveFile: inputFile,
                        }
                      : undefined,
                  );
                } catch (error) {
                  toast(
                    _({
                      ...MESSAGES.importFailed,
                      values: { reason: errorMessage(error) },
                    }),
                  );
                }
              }

              onClose();
            }}
          >
            <Trans id="navbar.importCodex.import">Import</Trans>
          </Button>
          <Button variant="secondary" onClick={onClose}>
            <Trans id="navbar.importCodex.cancel">Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface AdditionalDialogElementsProps {
  inputFile: File | null;
  inputValidation: CodexImportResult | undefined;
  deviceClasses: DeviceClassToImport[];
  selectedIdx: number;
  onSelectedIdxChange: (newIdx: number) => void;
}

const AdditionalDialogElements = ({
  inputFile,
  inputValidation,
  deviceClasses,
  selectedIdx,
  onSelectedIdxChange,
}: AdditionalDialogElementsProps) => {
  if (inputFile) {
    if (inputValidation === undefined) {
      // pending
      return (
        <div className="flex gap-2 items-center">
          <LoaderCircle className="h-6 w-6 animate-spin" />
          <div className="text-lg">
            <Trans id="navbar.importCodex.loading">
              Loading file contents...
            </Trans>
          </div>
        </div>
      );
    } else {
      // Either device class selection or validation failure to show
      if (inputValidation.valid) {
        return (
          <DeviceClassSelect
            deviceClasses={deviceClasses}
            selectedIdx={selectedIdx}
            onSelectedIdxChange={onSelectedIdxChange}
          />
        );
      } else {
        return (
          <ValidationFailure
            feedbackKind={inputValidation.feedbackKind!}
            feedback={inputValidation.feedback!}
          />
        );
      }
    }
  }
  // No file select yet, nothing to show
  return <></>;
};

interface DeviceClassSelectProps {
  deviceClasses: DeviceClassToImport[];
  selectedIdx: number;
  onSelectedIdxChange: (newIdx: number) => void;
}

const DeviceClassSelect = ({
  deviceClasses,
  selectedIdx,
  onSelectedIdxChange,
}: DeviceClassSelectProps) => {
  const { _ } = useLingui();

  if (deviceClasses.length === 0) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>
          <Trans id="navbar.importCodex.noDeviceClasses">
            No Device Classes found in selected document.
          </Trans>
        </AlertTitle>
      </Alert>
    );
  } else {
    return (
      <>
        <Trans id="navbar.importCodex.selectDeviceClass">
          Select Device Class to import:
        </Trans>
        <Select
          value={deviceClasses[selectedIdx]?.id ?? null}
          onValueChange={(id) => {
            onSelectedIdxChange(deviceClasses.findIndex((dc) => dc.id === id));
          }}
        >
          <SelectTrigger className="overflow-hidden max-w-sm">
            <SelectValue placeholder={_(MESSAGES.selectPlaceholder)} />
          </SelectTrigger>
          <SelectContent>
            {deviceClasses.map((dc, index) => (
              <SelectItem key={index} value={dc.id}>
                {_({
                  ...MESSAGES.deviceClassWithVersion,
                  values: { id: dc.id, version: dc.version },
                })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    );
  }
};

interface ValidationFailureProps {
  feedbackKind: FeedbackKind;
  feedback: MessageDescriptor;
}

const ValidationFailure = ({
  feedbackKind,
  feedback,
}: ValidationFailureProps) => {
  const { _ } = useLingui();

  switch (feedbackKind) {
    case FeedbackKind.UnableToReadFile:
      return (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans id="navbar.importCodex.unreadable">
              The selected file could not be read.
            </Trans>
          </AlertTitle>
        </Alert>
      );
    case FeedbackKind.ValidationFailed:
      return (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans id="navbar.importCodex.invalidData">
              The selected file contains invalid Fluxite Codex data.
            </Trans>
          </AlertTitle>
          <AlertDescription>
            <Textarea value={_(feedback)} readOnly />
          </AlertDescription>
        </Alert>
      );
    case FeedbackKind.ArchiveParsingFailed:
      return (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans id="navbar.importCodex.archiveParseFailed">
              Failed to parse Fluxite Codex archive.
            </Trans>
          </AlertTitle>
          <AlertDescription>
            <Textarea value={_(feedback)} readOnly />
          </AlertDescription>
        </Alert>
      );
    default:
      return (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            <Trans id="navbar.importCodex.unknownError">
              An unknown error occurred importing the selected file.
            </Trans>
          </AlertTitle>
        </Alert>
      );
  }
};

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { ExclamationCircleIcon } from "@heroicons/react/16/solid";
import {
  Dialog,
  DialogFooter,
  DialogContent,
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
import { AppInput } from "components/AppInput";
import {
  validateInputFile,
  UdrImportResult,
  DeviceClassToImport,
  FeedbackKind,
  getDeviceClassFromArchive,
  getDeviceClassFromDocument,
} from "./importUtils";
import { importDeviceClassEditor } from "./state";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportUdrDialog = ({ isOpen, onClose }: Props) => {
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputValidation, setInputValidation] = useState<
    UdrImportResult | undefined
  >(undefined);
  const [selectedDeviceClass, setSelectedDeviceClass] = useState(-1);

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
          <DialogTitle>Import UDR</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-2">
          <AppInput
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
                    throw new Error("No device class selected");
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
                    throw new Error("Error loading device class");
                  }

                  // Import the device class
                  await importDeviceClassEditor(
                    deviceClass.id,
                    deviceClass.version,
                    deviceClassDefinition,
                    inputValidation?.archive
                      ? {
                          archive: inputValidation.archive,
                          archiveFile: inputFile,
                        }
                      : undefined,
                  );
                } catch (error) {
                  toast(`Error importing device class: ${error}`);
                }
              }

              onClose();
            }}
          >
            Import
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

interface AdditionalDialogElementsProps {
  inputFile: File | null;
  inputValidation: UdrImportResult | undefined;
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
          <div className="text-lg">Loading file contents...</div>
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
  if (deviceClasses.length === 0) {
    return (
      <Alert variant="destructive">
        <ExclamationCircleIcon />
        <AlertTitle>No Device Classes found in selected document.</AlertTitle>
      </Alert>
    );
  } else {
    return (
      <>
        Select Device Class to import:
        <Select
          value={deviceClasses[selectedIdx]?.id ?? null}
          onValueChange={(id) => {
            onSelectedIdxChange(deviceClasses.findIndex((dc) => dc.id === id));
          }}
        >
          <SelectTrigger className="overflow-hidden max-w-sm">
            <SelectValue placeholder="Select a device class..." />
          </SelectTrigger>
          <SelectContent>
            {deviceClasses.map((dc, index) => {
              const dcString = deviceClassToString(dc);
              return (
                <SelectItem key={index} value={dc.id}>
                  {dcString}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </>
    );
  }
};

interface ValidationFailureProps {
  feedbackKind: FeedbackKind;
  feedback: string;
}

const ValidationFailure = ({
  feedbackKind,
  feedback,
}: ValidationFailureProps) => {
  switch (feedbackKind) {
    case FeedbackKind.UnableToReadFile:
      return (
        <Alert variant="destructive">
          <ExclamationCircleIcon />
          <AlertTitle>The selected file could not be read.</AlertTitle>
        </Alert>
      );
    case FeedbackKind.ValidationFailed:
      return (
        <Alert variant="destructive">
          <ExclamationCircleIcon />
          <AlertTitle>Selected file contains invalid UDR.</AlertTitle>
          <AlertDescription>
            <Textarea value={feedback} readOnly />
          </AlertDescription>
        </Alert>
      );
    case FeedbackKind.ArchiveParsingFailed:
      return (
        <Alert variant="destructive">
          <ExclamationCircleIcon />
          <AlertTitle>Failed to parse UDR archive.</AlertTitle>
          <AlertDescription>
            <Textarea value={feedback} readOnly />
          </AlertDescription>
        </Alert>
      );
    default:
      return (
        <Alert variant="destructive">
          <ExclamationCircleIcon />
          <AlertTitle>
            An unknown error occurred importing the selected file.
          </AlertTitle>
        </Alert>
      );
  }
};

function deviceClassToString(dc?: DeviceClassToImport): string {
  if (dc) {
    return `${dc.id} (${dc.version})`;
  } else {
    return "";
  }
}

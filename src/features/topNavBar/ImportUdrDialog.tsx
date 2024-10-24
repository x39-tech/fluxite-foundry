import {
  Button,
  Callout,
  Card,
  Classes,
  FileInput,
  H3,
  HTMLSelect,
  Spinner,
  TextArea,
} from "@blueprintjs/core";
import { RefObject, useRef, useState } from "react";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog";
import { E173Document, importUdr, Error as E173Error } from "e173";
import { importDeviceClassEditor } from "./state";
import "./ImportUdrDialog.css";

enum FeedbackKind {
  UnableToReadFile,
  ValidationFailed,
}

interface InputValidationResult {
  valid: boolean;
  feedbackKind?: FeedbackKind;
  feedback?: string;
  udr?: E173Document;
}

interface DeviceClass {
  id: string;
  version: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportUdrDialog = ({ isOpen, onClose }: Props) => {
  const [inputFile, setInputFile] = useState<File | null>(null);
  const [inputValidation, setInputValidation] = useState<
    InputValidationResult | undefined
  >(undefined);

  const deviceClassSelectRef = useRef<HTMLSelectElement>(null);

  let deviceClasses: DeviceClass[] = [];

  // Fix up state
  if (inputValidation?.valid) {
    deviceClasses = Object.entries(
      inputValidation.udr!.e173doc.deviceClasses!,
    ).reduce((accum, [key, value]) => {
      for (const version of Object.keys(value)) {
        accum.push({ id: key, version });
      }
      return accum;
    }, [] as DeviceClass[]);
  }

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>Import UDR Document</H3>
      </div>
      <div className={"import-udr-dialog-body " + Classes.DIALOG_BODY}>
        <FileInput
          text={inputFile ? inputFile.name : "Choose file..."}
          className="import-udr-file-input"
          onInputChange={(event) => {
            const file = event.currentTarget.files?.item(0) ?? null;
            setInputFile(file);

            if (file !== null) {
              const reader = new FileReader();
              reader.onload = (event) => {
                setInputValidation(
                  validateInputFile(event.target?.result as string | undefined),
                );
              };
              reader.readAsText(file);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (event.target as unknown as { value: any }).value = null;
          }}
          inputProps={{
            accept: "application/json,.udr",
          }}
        />
        {getAdditionalDialogElements(
          inputFile,
          inputValidation,
          deviceClasses,
          deviceClassSelectRef,
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <Button
          intent="success"
          icon="tick"
          disabled={
            !inputValidation ||
            !inputValidation.valid ||
            deviceClasses.length == 0
          }
          onClick={() => {
            if (deviceClassSelectRef.current !== null) {
              const deviceClass = stringToDeviceClass(
                deviceClassSelectRef.current.value,
              );

              const deviceClasses = inputValidation?.udr?.e173doc.deviceClasses;
              if (
                deviceClasses &&
                deviceClass.id in deviceClasses &&
                deviceClass.version in deviceClasses[deviceClass.id]
              ) {
                importDeviceClassEditor(
                  deviceClass.id,
                  inputValidation!.udr!.e173doc.deviceClasses![deviceClass.id]![
                    deviceClass.version
                  ]!,
                );
              }
            }

            onClose();
          }}
        >
          Import
        </Button>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </DarkModeAwareDialog>
  );
};

function validateInputFile(fileContent?: string): InputValidationResult {
  if (fileContent === undefined) {
    return { valid: false, feedbackKind: FeedbackKind.UnableToReadFile };
  }

  try {
    const udr = importUdr(fileContent);
    return { valid: true, udr };
  } catch (e) {
    const err = e as E173Error;
    return {
      valid: false,
      feedbackKind: FeedbackKind.ValidationFailed,
      feedback: `${err.type}: ${err.description}`,
    };
  }
}

function getAdditionalDialogElements(
  inputFile: File | null,
  inputValidation: InputValidationResult | undefined,
  deviceClasses: DeviceClass[],
  deviceClassSelectRef: RefObject<HTMLSelectElement>,
) {
  if (inputFile) {
    if (inputValidation === undefined) {
      // pending
      return (
        <Card>
          <H3>Loading file contents...</H3>
          <Spinner />
        </Card>
      );
    } else {
      // Either device class selection or validation failure to show
      if (inputValidation.valid) {
        return getDeviceClassSelectionElement(
          deviceClasses,
          deviceClassSelectRef,
        );
      } else {
        return getValidationFailureElement(
          inputValidation.feedbackKind!,
          inputValidation.feedback!,
        );
      }
    }
  }
  // No file select yet, nothing to show
  return <></>;
}

function getDeviceClassSelectionElement(
  deviceClasses: DeviceClass[],
  ref: RefObject<HTMLSelectElement>,
) {
  if (deviceClasses.length === 0) {
    return (
      <Callout intent="danger">
        No Device Classes found in selected document.
      </Callout>
    );
  } else {
    return (
      <>
        <p>Select Device Class to import:</p>
        <HTMLSelect
          ref={ref}
          options={deviceClasses.map(deviceClassToString)}
        />
      </>
    );
  }
}

function getValidationFailureElement(
  feedbackKind: FeedbackKind,
  feedback: string,
) {
  switch (feedbackKind) {
    case FeedbackKind.UnableToReadFile:
      return (
        <Callout intent="danger">The selected file could not be read.</Callout>
      );
    case FeedbackKind.ValidationFailed:
      return (
        <Callout intent="danger">
          <p>Selected file contains invalid UDR. Details:</p>
          <TextArea value={feedback} small fill readOnly />
        </Callout>
      );
    default:
      return <></>;
  }
}

function deviceClassToString(dc?: DeviceClass): string {
  if (dc) {
    return `${dc.id} (${dc.version})`;
  } else {
    return "";
  }
}

function stringToDeviceClass(str: string): DeviceClass {
  const match = str.match(/([^\s]+) \(([^)]+)\)/);
  return { id: match![1], version: match![2] };
}

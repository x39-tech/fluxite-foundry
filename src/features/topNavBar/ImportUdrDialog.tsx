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
import { useState } from "react";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import udrDocumentSchema from "e173/schemas/draft-2023-1/full/udr-document.json";
import { E173UDRDocuments as UDRDocument } from "generated/draft-2023-1/udr-document";
import { validateWithSchema } from "utils/schemaValidation";
import { importDeviceClassEditor } from "./state";
import "./ImportUdrDialog.css";

enum FeedbackKind {
  UnableToReadFile,
  InvalidJson,
  SchemaValidationFailed,
}

interface InputValidationResult {
  valid: boolean;
  feedbackKind?: FeedbackKind;
  feedback?: string;
  udr?: UDRDocument;
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
  const [selectedDeviceClass, setSelectedDeviceClass] = useState<
    string | undefined
  >(undefined);

  // Fix up state
  if (inputValidation?.valid && hasDeviceClasses(inputValidation.udr!)) {
    const deviceClassKeys = Object.keys(
      inputValidation.udr!.e173doc.deviceClasses!,
    );
    if (
      !selectedDeviceClass ||
      !deviceClassKeys.includes(selectedDeviceClass)
    ) {
      setSelectedDeviceClass(deviceClassKeys[0]);
    }
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
          selectedDeviceClass,
          setSelectedDeviceClass,
        )}
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <Button
          intent="success"
          icon="tick"
          disabled={
            !inputValidation ||
            !inputValidation.valid ||
            !hasDeviceClasses(inputValidation.udr!) ||
            !selectedDeviceClass
          }
          onClick={() => {
            importDeviceClassEditor(
              selectedDeviceClass!,
              inputValidation!.udr!.e173doc.deviceClasses![
                selectedDeviceClass!
              ],
            );

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
    const fileJson = JSON.parse(fileContent);

    const validateResult = validateWithSchema(udrDocumentSchema, fileJson);
    if (validateResult !== true) {
      return {
        valid: false,
        feedbackKind: FeedbackKind.SchemaValidationFailed,
        feedback: validateResult,
      };
    }
    return { valid: true, udr: fileJson as UDRDocument };
  } catch (err) {
    return {
      valid: false,
      feedbackKind: FeedbackKind.InvalidJson,
      feedback: `${err}`,
    };
  }
}

function getAdditionalDialogElements(
  inputFile: File | null,
  inputValidation: InputValidationResult | undefined,
  selectedDeviceClass: string | undefined,
  setSelectedDeviceClass: React.Dispatch<
    React.SetStateAction<string | undefined>
  >,
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
          inputValidation.udr!,
          selectedDeviceClass,
          setSelectedDeviceClass,
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
  udr: UDRDocument,
  selectedDeviceClass: string | undefined,
  setSelectedDeviceClass: React.Dispatch<
    React.SetStateAction<string | undefined>
  >,
) {
  if (
    !udr.e173doc.deviceClasses ||
    Object.keys(udr.e173doc.deviceClasses!).length === 0
  ) {
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
          options={Object.keys(udr.e173doc.deviceClasses)}
          value={selectedDeviceClass}
          onChange={(event) =>
            setSelectedDeviceClass(event.currentTarget.value)
          }
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
    case FeedbackKind.InvalidJson:
      return (
        <Callout intent="danger">
          <p>
            JSON parsing error(s) encountered while loading the selected file:
          </p>
          <TextArea
            fill={true}
            growVertically={true}
            small={true}
            readOnly={true}
          >
            {feedback}
          </TextArea>
        </Callout>
      );
    case FeedbackKind.SchemaValidationFailed:
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

function hasDeviceClasses(udr: UDRDocument): boolean {
  return (
    udr.e173doc.deviceClasses !== undefined &&
    Object.keys(udr.e173doc.deviceClasses).length > 0
  );
}

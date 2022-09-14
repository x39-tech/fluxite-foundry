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
import udrDocumentSchema from "generated/DocumentSchema.json";
import "./ImportUdrDialog.css";
import { Document } from "udr/objects/document";
import Ajv, { ErrorObject } from "ajv";
import { useAppDispatch } from "app/hooks";
import { importEditor } from "features/fixtureEditor/fixtureEditorSlice";

enum FeedbackKind {
  UnableToReadFile,
  InvalidJson,
  SchemaValidationFailed,
}

interface InputValidationResult {
  valid: boolean;
  feedbackKind?: FeedbackKind;
  feedback?: string;
  udr?: Document;
}

export interface ImportUdrDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportUdrDialog: React.FC<ImportUdrDialogProps> = ({
  isOpen,
  onClose,
}) => {
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
      inputValidation.udr!.e173.deviceClasses!
    );
    if (
      !selectedDeviceClass ||
      !deviceClassKeys.includes(selectedDeviceClass)
    ) {
      setSelectedDeviceClass(deviceClassKeys[0]);
    }
  }

  const dispatch = useAppDispatch();

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
                  validateInputFile(event.target?.result as string | undefined)
                );
              };
              reader.readAsText(file);
            }

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
          setSelectedDeviceClass
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
            dispatch(
              importEditor({
                id: selectedDeviceClass!,
                udr: inputValidation!.udr!.e173.deviceClasses![
                  selectedDeviceClass!
                ],
              })
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

    const ajv = new Ajv();
    const valid = ajv.validate(udrDocumentSchema, fileJson);
    if (!valid) {
      return {
        valid: false,
        feedbackKind: FeedbackKind.SchemaValidationFailed,
        feedback: getHumanReadableErrors(ajv.errors ?? undefined),
      };
    }
    return { valid: true, udr: fileJson };
  } catch (err) {
    return {
      valid: false,
      feedbackKind: FeedbackKind.InvalidJson,
      feedback: `${err}`,
    };
  }
}

function getHumanReadableErrors(errors?: ErrorObject[]): string {
  if (errors === undefined) {
    return "No errors found";
  }

  return errors
    .map(
      (error) =>
        `Path '${error.instancePath || "/"}': ${error.message} (${
          error.keyword
        })`
    )
    .join("\n");
}

function getAdditionalDialogElements(
  inputFile: File | null,
  inputValidation: InputValidationResult | undefined,
  selectedDeviceClass: string | undefined,
  setSelectedDeviceClass: React.Dispatch<
    React.SetStateAction<string | undefined>
  >
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
          setSelectedDeviceClass
        );
      } else {
        return getValidationFailureElement(
          inputValidation.feedbackKind!,
          inputValidation.feedback!
        );
      }
    }
  }
  // No file select yet, nothing to show
  return <></>;
}

function getDeviceClassSelectionElement(
  udr: Document,
  selectedDeviceClass: string | undefined,
  setSelectedDeviceClass: React.Dispatch<
    React.SetStateAction<string | undefined>
  >
) {
  if (
    !udr.e173.deviceClasses ||
    Object.keys(udr.e173.deviceClasses!).length === 0
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
          options={Object.keys(udr.e173.deviceClasses)}
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
  feedback: string
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

function hasDeviceClasses(udr: Document): boolean {
  return (
    udr.e173.deviceClasses !== undefined &&
    Object.keys(udr.e173.deviceClasses).length > 0
  );
}

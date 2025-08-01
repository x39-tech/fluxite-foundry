// A component that renders a Blueprint EditableText inline text editor with optional validation.
// Can either be controlled (value) or uncontrolled (defaultValue).

import { useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/16/solid";
import { EditableText } from "../EditableText";
import { InputValidationResult } from "utils/inputValidation";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "components/scn-ui/Popover";
import { Alert, AlertDescription } from "components/scn-ui/Alert";

interface CommonTextEditorFieldProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  validator?: (value: string) => InputValidationResult;
  validationErrorPlacement?: "top" | "bottom" | "left" | "right";
}

interface TextEditorFieldProps extends CommonTextEditorFieldProps {
  onValueChanged: (newValue: string) => void;
}

// A field with editable text.
export const TextEditorField = ({
  value,
  defaultValue,
  placeholder,
  onValueChanged,
  validator,
  validationErrorPlacement,
}: TextEditorFieldProps) => {
  const defaultText = value ?? (defaultValue || "");

  const [validationResult, setValidationResult] = useState(
    validator ? validator(defaultText) : { isValid: true },
  );
  const [stagedText, setStagedText] = useState(defaultText);
  const [isEditing, setIsEditing] = useState(false);

  const textToDisplay = (() => {
    if (!isEditing && value && value != stagedText) {
      return value;
    } else {
      return stagedText;
    }
  })();

  return (
    <Popover
      open={
        !validationResult.isValid && validationResult.feedback !== undefined
      }
      onOpenChange={(isOpen) => {
        console.log(`openChange: ${isOpen}`);
      }}
    >
      <PopoverAnchor className="inline-block">
        <EditableText
          value={textToDisplay}
          placeholder={placeholder}
          onChange={(newValue) => {
            if (validator) {
              setValidationResult(validator(newValue));
            }
            setIsEditing(true);
            setStagedText(newValue);
          }}
          onConfirm={(newValue) => {
            if (validationResult.isValid) {
              onValueChanged(newValue);
            } else {
              if (validator) {
                setValidationResult(validator(defaultText));
              }
              setStagedText(defaultText);
            }
            setIsEditing(false);
          }}
          onCancel={() => {
            setStagedText(defaultText);
            setIsEditing(false);
            if (validator) {
              setValidationResult(validator(defaultText));
            }
          }}
          intent={validationResult.isValid ? "none" : "danger"}
        />
      </PopoverAnchor>
      <PopoverContent
        asChild
        side={validationErrorPlacement}
        onOpenAutoFocus={(e) => {
          e.preventDefault();
        }}
      >
        <Alert variant="destructive">
          <ExclamationCircleIcon />
          <AlertDescription>
            {validationResult.feedback || "An unknown error occurred."}
          </AlertDescription>
        </Alert>
      </PopoverContent>
    </Popover>
  );
};

interface OptionalTextEditorFieldProps extends CommonTextEditorFieldProps {
  onValueChanged: (value?: string) => void;
}

// Similar to TextEditorField, but the onValueChanged callback passes 'undefined' if the new value
// is an empty string. This is useful in the case where you want to delete the property from an
// encompassing object completely if the field is cleared.
export const OptionalTextEditorField = (
  props: OptionalTextEditorFieldProps,
) => {
  return (
    <TextEditorField
      {...props}
      onValueChanged={(newValue) =>
        props.onValueChanged(newValue === "" ? undefined : newValue)
      }
    />
  );
};

// TextEditor/OptionalTextEditor component rendered inside a table row with an accompanying label.

export interface TextEditorTableRowProps extends TextEditorFieldProps {
  label: string;
}

export const TextEditorTableRow = (props: TextEditorTableRowProps) => {
  return (
    <tr>
      <td className="align-middle">{props.label}</td>
      <td>
        <TextEditorField {...props} />
      </td>
    </tr>
  );
};

export interface OptionalTextEditorTableRowProps
  extends OptionalTextEditorFieldProps {
  label: string;
}

export const OptionalTextEditorTableRow = (
  props: OptionalTextEditorTableRowProps,
) => {
  return (
    <tr>
      <td className="align-middle">{props.label}</td>
      <td className="block">
        <OptionalTextEditorField {...props} />
      </td>
    </tr>
  );
};

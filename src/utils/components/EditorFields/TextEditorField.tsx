// A component that renders a Blueprint EditableText inline text editor with optional validation.
// Can either be controlled (value) or uncontrolled (defaultValue).

import { useState } from "react";
import { Callout } from "@blueprintjs/core";
import { EditableText } from "../EditableText";
import { Placement, Popover2 } from "@blueprintjs/popover2";
import { InputValidationResult } from "utils/inputValidation";

interface CommonTextEditorFieldProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  validator?: (value: string) => InputValidationResult;
  validationErrorPlacement?: Placement;
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
    <Popover2
      isOpen={
        !validationResult.isValid && validationResult.feedback !== undefined
      }
      content={<Callout intent="danger">{validationResult.feedback}</Callout>}
      autoFocus={false}
      enforceFocus={false}
      placement={validationErrorPlacement}
    >
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
    </Popover2>
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
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
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
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <OptionalTextEditorField {...props} />
      </td>
    </tr>
  );
};

import { useState } from "react";
import { Callout, EditableText } from "@blueprintjs/core";
import { Placement, Popover2 } from "@blueprintjs/popover2";
import { InputValidationResult } from "utils/inputValidation";

export type TextEditorValidator = (value: string) => InputValidationResult;

// A component that renders a Blueprint EditableText inline text editor with optional validation.

export interface TextEditorFieldProps {
  defaultValue?: string;
  onValueChanged: (value: string) => void;
  validator?: TextEditorValidator;
  validationErrorPlacement?: Placement;
}

export const TextEditorField: React.FC<TextEditorFieldProps> = ({
  defaultValue,
  onValueChanged,
  validator,
  validationErrorPlacement,
}) => {
  const defaultText = defaultValue || "";

  const [validationResult, setValidationResult] = useState(
    validator ? validator(defaultText) : { isValid: true }
  );
  const [stagedText, setStagedText] = useState(defaultText);
  const [resetToDefault, setResetToDefault] = useState(false);

  if (resetToDefault) {
    setStagedText(defaultText);
    if (validator) {
      setValidationResult(validator(defaultText));
    }
    setResetToDefault(false);
  }

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
        value={stagedText}
        onChange={(newValue) => {
          if (validator) {
            setValidationResult(validator(newValue));
          }
          setStagedText(newValue);
        }}
        onConfirm={(newValue) => {
          if (validationResult.isValid) {
            onValueChanged(newValue);
          }
          setResetToDefault(true);
        }}
        intent={validationResult.isValid ? "none" : "danger"}
      />
    </Popover2>
  );
};

// TextEditor component rendered inside a table row with an accompanying label.

export interface TextEditorTableRowProps extends TextEditorFieldProps {
  label: string;
}

export const TextEditorTableRow: React.FC<TextEditorTableRowProps> = (
  props
) => {
  return (
    <tr>
      <td style={{ verticalAlign: "middle" }}>{props.label}</td>
      <td>
        <TextEditorField {...props} />
      </td>
    </tr>
  );
};

// A component that renders a ConfirmableInput inline text editor with optional validation.
// Can either be controlled (value) or uncontrolled (defaultValue).

import { useId, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/16/solid";
import { ConfirmableInput } from "../ConfirmableInput";
import { InputValidationResult } from "utils/inputValidation";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "components/scn-ui/Popover";
import { Alert, AlertDescription } from "components/scn-ui/Alert";

interface CommonTextEditorFieldProps {
  value?: string;
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
  placeholder,
  onValueChanged,
  validator,
  validationErrorPlacement = "right",
}: TextEditorFieldProps) => {
  const [validationResult, setValidationResult] =
    useState<InputValidationResult>({ isValid: true });

  return (
    <Popover
      open={
        !validationResult.isValid && validationResult.feedback !== undefined
      }
    >
      <PopoverAnchor className="inline-block">
        <ConfirmableInput
          value={value}
          validator={validator}
          onValidationResult={(_, result) => setValidationResult(result)}
          onConfirm={onValueChanged}
          placeholder={placeholder}
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
  const id = useId();

  return (
    <tr>
      <td id={id} className="align-middle">
        {props.label}
      </td>
      <td>
        <TextEditorField aria-labelledby={id} {...props} />
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

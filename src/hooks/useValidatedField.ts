// Editing behavior shared by the single-line and multi-line validated text
// fields: hold an edit locally, validate it as it is typed, and confirm it on
// blur or cancel it back to the saved value.

import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { InputValidationResult } from "utils/inputValidation";

type TextField = HTMLInputElement | HTMLTextAreaElement;

export interface ValidatedFieldOptions {
  value: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  validator?: (value: string) => InputValidationResult;
  maxLength?: number;
  confirmOnEnterKey?: boolean;
  cancelOnEscapeKey?: boolean;
}

export const useValidatedField = <T extends TextField>({
  value,
  onConfirm,
  onCancel,
  validator,
  maxLength,
  confirmOnEnterKey = true,
  cancelOnEscapeKey = true,
}: ValidatedFieldOptions) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [validationResult, setValidationResult] =
    useState<InputValidationResult>({ isValid: true });
  const fieldRef = useRef<T>(null);

  const reset = () => {
    setCurrentValue(value);
    setValidationResult(validator ? validator(value) : { isValid: true });
  };

  // Override saved value with new value if it changes
  useEffect(() => {
    reset();
  }, [value]);

  const handleConfirm = () => {
    if (!validator || validator(currentValue).isValid) {
      onConfirm?.(currentValue);
    } else {
      onCancel?.();
      reset();
    }
  };

  const handleCancel = () => {
    onCancel?.();
    reset();
  };

  const handleChange = (e: ChangeEvent<T>) => {
    const newValue = e.target.value;

    if (maxLength && newValue.length > maxLength) return;

    if (validator) {
      setValidationResult(validator(newValue));
    }
    setCurrentValue(newValue);
  };

  const handleKeyDown = (e: KeyboardEvent<T>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter" && confirmOnEnterKey) {
      e.preventDefault();
      handleConfirm();
      fieldRef.current?.blur();
    } else if (e.key === "Escape" && cancelOnEscapeKey) {
      e.preventDefault();
      handleCancel();
      // Calling blur() immediately triggers the onblur event and thus the
      // handleConfirm function with the current value. Delay until after
      // the component is re-rendered to make sure confirm is called with
      // the old value.
      setTimeout(() => fieldRef.current?.blur(), 0);
    }
  };

  return {
    validationResult,
    fieldProps: {
      ref: fieldRef,
      "aria-invalid": !validationResult.isValid,
      value: currentValue,
      maxLength,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onBlur: handleConfirm,
    },
  };
};

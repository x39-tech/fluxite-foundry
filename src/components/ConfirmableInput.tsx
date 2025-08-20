// Models a controlled input which stages the current value while focused, and makes a decision on
// whether to 'confirm' or 'cancel' it when focused out or on certain key presses.

import { useState, useEffect, KeyboardEvent, ChangeEvent, useRef } from "react";
import { AppInput } from "components/AppInput";
import { InputValidationResult } from "utils/inputValidation";

export interface ConfirmableInputProps {
  value?: string;
  defaultValue?: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  validator?: (value: string) => InputValidationResult;
  onValidationResult?: (value: string, result: InputValidationResult) => void;
  confirmOnEnterKey?: boolean;
  cancelOnEscapeKey?: boolean;
}

export const ConfirmableInput = ({
  value,
  maxLength,
  onConfirm,
  onCancel,
  validator,
  onValidationResult,
  confirmOnEnterKey = true,
  cancelOnEscapeKey = true,
  ...props
}: React.ComponentProps<"input"> & ConfirmableInputProps) => {
  const defaultText = value ?? "";

  const inputRef = useRef<HTMLInputElement>(null);
  const [currentValue, setCurrentValue] = useState<string>(defaultText);

  useEffect(() => {
    if (value !== undefined) {
      setCurrentValue(value);
    }
  }, [value]);

  const handleConfirm = () => {
    if (!validator || validator(currentValue).isValid) {
      onConfirm?.(currentValue);
    } else {
      onCancel?.();
      setCurrentValue(defaultText);
      onValidationResult?.(defaultText, validator(defaultText));
    }
  };

  const handleCancel = () => {
    setCurrentValue(defaultText);
    onCancel?.();
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (maxLength && newValue.length > maxLength) return;

    if (validator && onValidationResult) {
      const result = validator(newValue);
      onValidationResult(newValue, result);
    }
    setCurrentValue(newValue);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    if (e.key === "Enter" && confirmOnEnterKey) {
      e.preventDefault();
      handleConfirm();
      inputRef.current?.blur();
    } else if (e.key === "Escape" && cancelOnEscapeKey) {
      e.preventDefault();
      handleCancel();
      // Calling blur() immediately triggers the onblur event and thus the
      // handleConfirm function with the current value. Delay until after
      // the component is re-rendered to make sure confirm is called with
      // the old value.
      setTimeout(() => inputRef.current?.blur(), 0);
    }
  };

  return (
    <AppInput
      ref={inputRef}
      minimal
      dynamicWidth
      value={currentValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleConfirm}
      maxLength={maxLength}
      {...props}
    />
  );
};

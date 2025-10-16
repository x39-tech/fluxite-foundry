import { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from "react";
import { ExclamationCircleIcon } from "@heroicons/react/16/solid";
import { InputValidationResult } from "utils/inputValidation";
import { Popover, PopoverAnchor, PopoverContent } from "./scn-ui/Popover";
import { Alert, AlertDescription } from "./scn-ui/Alert";
import { AppInput, AppInputProps } from "./AppInput";

interface Props {
  value: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  validator?: (value: string) => InputValidationResult;
  confirmOnEnterKey?: boolean;
  cancelOnEscapeKey?: boolean;
  popoverSide?: "top" | "right" | "bottom" | "left";
}

export const ValidatedInput = ({
  value,
  maxLength,
  onConfirm,
  onCancel,
  validator,
  confirmOnEnterKey = true,
  cancelOnEscapeKey = true,
  popoverSide,
  className,
  ...props
}: AppInputProps & Props) => {
  const [currentValue, setCurrentValue] = useState(value);
  const [validationResult, setValidationResult] =
    useState<InputValidationResult>({ isValid: true });
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setCurrentValue(value);
    if (validator) {
      setValidationResult(validator(value));
    } else {
      setValidationResult({ isValid: true });
    }
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

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (maxLength && newValue.length > maxLength) return;

    if (validator) {
      setValidationResult(validator(newValue));
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
    <Popover
      open={
        !validationResult.isValid && validationResult.feedback !== undefined
      }
    >
      <PopoverAnchor className="inline-block">
        <AppInput
          ref={inputRef}
          aria-invalid={!validationResult.isValid}
          value={currentValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleConfirm}
          maxLength={maxLength}
          {...props}
        />
      </PopoverAnchor>
      <PopoverContent
        asChild
        side={popoverSide}
        onOpenAutoFocus={(e) => e.preventDefault()}
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

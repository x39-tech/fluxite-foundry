import { InputValidationResult } from "utils/inputValidation";
import { useValidatedField } from "hooks/useValidatedField";
import { ValidationPopover } from "./ValidationPopover";
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
  const { validationResult, fieldProps } = useValidatedField<HTMLInputElement>({
    value,
    onConfirm,
    onCancel,
    validator,
    maxLength,
    confirmOnEnterKey,
    cancelOnEscapeKey,
  });

  return (
    <ValidationPopover
      result={validationResult}
      side={popoverSide}
      anchorClassName="inline-block"
    >
      <AppInput className={className} {...fieldProps} {...props} />
    </ValidationPopover>
  );
};

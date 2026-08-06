import { ComponentProps } from "react";
import { cn } from "utils/utils";
import { InputValidationResult } from "utils/inputValidation";
import { useValidatedField } from "hooks/useValidatedField";
import { ValidationPopover } from "./ValidationPopover";
import { Textarea } from "./scn-ui/Textarea";

interface Props {
  value: string;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  validator?: (value: string) => InputValidationResult;
  cancelOnEscapeKey?: boolean;
  popoverSide?: "top" | "right" | "bottom" | "left";
}

export const ValidatedTextarea = ({
  value,
  maxLength,
  onConfirm,
  onCancel,
  validator,
  cancelOnEscapeKey = true,
  popoverSide,
  className,
  ...props
}: ComponentProps<"textarea"> & Props) => {
  const { validationResult, fieldProps } =
    useValidatedField<HTMLTextAreaElement>({
      value,
      onConfirm,
      onCancel,
      validator,
      maxLength,
      confirmOnEnterKey: false,
      cancelOnEscapeKey,
    });

  return (
    <ValidationPopover result={validationResult} side={popoverSide}>
      <Textarea
        className={cn("bg-background", className)}
        {...fieldProps}
        {...props}
      />
    </ValidationPopover>
  );
};

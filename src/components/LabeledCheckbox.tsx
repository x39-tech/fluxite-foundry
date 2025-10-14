import { useId } from "react";
import { Checkbox } from "./scn-ui/Checkbox";
import { Label } from "./scn-ui/Label";
import { cn } from "utils/utils";

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  children: string;
}

export const LabeledCheckbox = ({
  checked,
  onChange,
  disabled = false,
  className = "",
  children,
}: CheckboxProps) => {
  const id = useId();

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        onCheckedChange={(checked) =>
          typeof checked === "boolean" && onChange(checked)
        }
      />
      <Label htmlFor={id}>{children}</Label>
    </div>
  );
};

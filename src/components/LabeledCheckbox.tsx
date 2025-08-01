import { Checkbox, Field, Label } from "@headlessui/react";

export interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const LabeledCheckbox = ({
  label,
  checked,
  onChange,
  disabled = false,
  className = "",
}: CheckboxProps) => {
  return (
    <Field
      className={`flex items-center gap-2 ${className}`}
      disabled={disabled}
    >
      <Checkbox
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className="group size-4 rounded border bg-white data-checked:bg-blue-500"
      >
        <svg
          className="stroke-white opacity-0 group-data-checked:opacity-100"
          viewBox="0 0 14 14"
          fill="none"
        >
          <path
            d="M3 8L6 11L11 3.5"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Checkbox>
      <Label>{label}</Label>
    </Field>
  );
};

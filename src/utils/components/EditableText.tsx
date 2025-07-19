import { useState, useRef, useEffect, KeyboardEvent, RefObject } from "react";

export interface EditableTextProps {
  value?: string;
  defaultValue?: string;
  placeholder?: string;
  intent?: "none" | "primary" | "success" | "warning" | "danger";
  disabled?: boolean;
  maxLength?: number;
  multiline?: boolean;
  onChange?: (value: string) => void;
  onConfirm?: (value: string) => void;
  onCancel?: () => void;
  onEdit?: () => void;
  selectAllOnFocus?: boolean;
  confirmOnEnterKey?: boolean;
  cancelOnEscapeKey?: boolean;
  className?: string;
}

export const EditableText = ({
  value,
  defaultValue,
  placeholder = "Click to edit...",
  intent = "none",
  disabled = false,
  maxLength,
  multiline = false,
  onChange,
  onConfirm,
  onCancel,
  onEdit,
  confirmOnEnterKey = true,
  cancelOnEscapeKey = true,
  className = "",
}: EditableTextProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value ?? defaultValue ?? "");
  const inputRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (value !== undefined) {
      setCurrentValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleEdit = () => {
    if (disabled) return;
    setIsEditing(true);
    onEdit?.();
  };

  const handleConfirm = () => {
    setIsEditing(false);
    onConfirm?.(currentValue);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setCurrentValue(value ?? defaultValue ?? "");
    onCancel?.();
  };

  const handleChange = (newValue: string) => {
    if (maxLength && newValue.length > maxLength) return;
    setCurrentValue(newValue);
    onChange?.(newValue);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && confirmOnEnterKey && !multiline) {
      e.preventDefault();
      handleConfirm();
    } else if (e.key === "Escape" && cancelOnEscapeKey) {
      e.preventDefault();
      handleCancel();
    }
  };

  const handleBlur = () => {
    if (isEditing) {
      handleConfirm();
    }
  };

  const getIntentClass = () => {
    switch (intent) {
      case "primary":
        return "border-blue-500 focus:border-blue-600";
      case "success":
        return "border-green-500 focus:border-green-600";
      case "warning":
        return "border-yellow-500 focus:border-yellow-600";
      case "danger":
        return "border-red-500 focus:border-red-600";
      default:
        return "focus:border-blue-500";
    }
  };

  const baseClasses = `
    px-0.5 rounded-sm transition-colors duration-150 border
    ${disabled ? "cursor-not-allowed opacity-60" : "cursor-text"}
    ${className}
  `.trim();

  const displayValue = currentValue || placeholder;
  const showPlaceholder = !currentValue && placeholder;

  if (isEditing) {
    const InputComponent = multiline ? "textarea" : "input";
    return (
      <InputComponent
        ref={
          inputRef as RefObject<HTMLInputElement> &
            RefObject<HTMLTextAreaElement>
        }
        value={currentValue}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={`${baseClasses} ${getIntentClass()} focus:outline-none focus:ring-1 focus:ring-blue-500`}
        maxLength={maxLength}
        rows={multiline ? 3 : undefined}
      />
    );
  }

  return (
    <button
      aria-label="Edit"
      onClick={handleEdit}
      className={`
        ${baseClasses}
        ${getIntentClass()}
        border-transparent hover:border-gray-500 
        ${showPlaceholder ? "text-gray-400 italic" : ""}
      `.trim()}
    >
      {displayValue}
    </button>
  );
};

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
  const [inputWidth, setInputWidth] = useState<number | undefined>(undefined);
  const inputRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLSpanElement>(null);

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

  const calculateInputWidth = (text: string) => {
    if (multiline) return undefined;

    const minWidth = 40; // Minimum width in pixels
    const maxWidth = 400; // Maximum width in pixels
    const padding = 20; // Extra padding for cursor and comfort

    // Use heuristic calculation as baseline
    const textLength = (text || placeholder || "W").length;
    const estimatedWidth = Math.max(minWidth, textLength * 8 + padding);
    let calculatedWidth = Math.min(maxWidth, estimatedWidth);

    // If measureRef is available, use precise DOM measurement
    if (measureRef.current) {
      const textToMeasure = text || placeholder || "W";
      measureRef.current.textContent = textToMeasure;
      const measuredWidth = measureRef.current.offsetWidth + padding;
      calculatedWidth = Math.max(minWidth, Math.min(maxWidth, measuredWidth));
    }

    return calculatedWidth;
  };

  useEffect(() => {
    // Only update width for content changes while editing, not when entering edit mode
    if (isEditing) {
      setInputWidth(calculateInputWidth(currentValue));
    }
  }, [currentValue, placeholder, multiline]);

  const handleEdit = () => {
    if (disabled) return;
    // Calculate width before entering edit mode to avoid transition flash
    setInputWidth(calculateInputWidth(currentValue));
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
    const newWidth = calculateInputWidth(newValue);
    setInputWidth(newWidth);
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
        return "border-blue-500";
      case "success":
        return "border-green-500";
      case "warning":
        return "border-yellow-500";
      case "danger":
        return "border-red-500";
      default:
        return "";
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
    const inputStyle = inputWidth ? { width: `${inputWidth}px` } : undefined;

    return (
      <>
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
          style={inputStyle}
          maxLength={maxLength}
          rows={multiline ? 3 : undefined}
        />
        {/* Hidden span for measuring text width */}
        <span
          ref={measureRef}
          className={`${baseClasses} absolute invisible whitespace-pre pointer-events-none`}
        />
      </>
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

// Note: edited from original from shadcn-ui to add minimal and dynamicWidth, plus some minor style adjustments

import {
  ComponentProps,
  useState,
  useRef,
  ChangeEvent,
  useEffect,
  forwardRef,
} from "react";

import { cn } from "utils/utils";

interface InputProps {
  // Force these types to string, React uses string | number | readonly string[]
  value?: string;
  defaultValue?: string;

  // Render the input as transparent when not focused
  minimal?: boolean;
  // Resize the input to fit the length of its content
  dynamicWidth?: boolean;
}

type Props = ComponentProps<"input"> & InputProps;

const Input = forwardRef<HTMLInputElement, Props>(function Input(
  {
    value,
    defaultValue,
    placeholder,
    onChange,
    minimal = false,
    dynamicWidth = false,
    className,
    type,
    ...props
  },
  ref,
) {
  const [currentValue, setCurrentValue] = useState(value ?? defaultValue ?? "");
  const [inputWidth, setInputWidth] = useState<number | undefined>(undefined);
  const measureRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (dynamicWidth) {
      const newInputWidth = calculateInputWidth(currentValue);
      if (newInputWidth !== inputWidth) {
        setInputWidth(newInputWidth);
      }
    }
  }, [currentValue, placeholder]);

  useEffect(() => {
    if (value !== undefined) {
      setCurrentValue(value);
    }
  }, [value]);

  const calculateInputWidth = (text: string) => {
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

  const colorClasses = minimal
    ? "hover:bg-input/30 focus-visible:bg-background dark:hover:bg-input/30 dark:focus-visible:bg-input/30 border-transparent shadow-none focus-visible:border dark:bg-transparent"
    : "dark:bg-input/30 border-input shadow-xs";

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCurrentValue(newValue);
    if (dynamicWidth) {
      const newWidth = calculateInputWidth(newValue);
      setInputWidth(newWidth);
    }
    onChange?.(e);
  };

  const inputStyle = inputWidth ? { width: `${inputWidth}px` } : undefined;
  const xPadding = "px-2";

  const input = (
    <input
      ref={ref}
      value={currentValue}
      onChange={handleChange}
      type={type}
      placeholder={placeholder}
      data-slot="input"
      style={inputStyle}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground flex h-7 min-w-0 rounded-md border bg-transparent text-base transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        xPadding,
        dynamicWidth ? "" : "w-full",
        colorClasses,
        className,
      )}
      {...props}
    />
  );

  if (dynamicWidth) {
    return (
      <>
        {input}
        <span
          ref={measureRef}
          className={`absolute invisible whitespace-pre pointer-events-none ${xPadding}`}
        />
      </>
    );
  } else {
    return input;
  }
});

export { Input };

import { ChevronDownIcon } from "@heroicons/react/24/solid";
import { forwardRef } from "react";

export interface SelectOption {
  value: string;
  label?: string;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  large?: boolean;
  fill?: boolean;
  options?: SelectOption[] | string[];
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = "",
      large = false,
      fill = false,
      options,
      children,
      ...props
    },
    ref,
  ) => {
    const baseClasses =
      "w-full appearance-none cursor-pointer border rounded focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed bg-white dark:bg-gray-800";

    const getSizeClasses = () => {
      if (large) {
        return "px-3 py-2 text-base pr-10";
      }
      return "px-2 py-1 text-sm pr-8";
    };

    const styleClasses =
      "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500";

    const combinedClasses = `${baseClasses} ${getSizeClasses()} ${styleClasses}`;

    const renderOptions = () => {
      if (children) {
        return children;
      }
      if (options) {
        return options.map((option, index) => {
          if (typeof option === "string") {
            return (
              <option key={index} value={option}>
                {option}
              </option>
            );
          } else {
            return (
              <option key={index} value={option.value}>
                {option.label || option.value}
              </option>
            );
          }
        });
      }
      return null;
    };

    return (
      <div
        className={`relative ${fill ? "w-full" : "inline-block"} ${className}`}
      >
        <select ref={ref} className={combinedClasses} {...props}>
          {renderOptions()}
        </select>
        <div
          className={`absolute inset-y-0 right-0 flex items-center pointer-events-none ${large ? "pr-3" : "pr-2"}`}
        >
          <ChevronDownIcon
            className={`${large ? "size-5" : "size-4"} text-gray-400 dark:text-gray-500`}
          />
        </div>
      </div>
    );
  },
);

Select.displayName = "Select";

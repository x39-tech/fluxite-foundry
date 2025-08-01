// A button with text and an optional icon on the left and/or right side

import * as SolidIcons from "@heroicons/react/24/solid";
import * as OutlineIcons from "@heroicons/react/24/outline";

export interface ButtonProps {
  icon?: string;
  iconType?: "solid" | "outline";
  rightIcon?: string;
  rightIconType?: "solid" | "outline";
  iconSize?: 3 | 4 | 5;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  disabled?: boolean;
  active?: boolean;
  minimal?: boolean;
  intent?: "success";
  "aria-label"?: string;
  children?: React.ReactNode;
}

export const Button = ({
  minimal = false,
  icon,
  iconType = "solid",
  rightIcon,
  rightIconType = "solid",
  iconSize = 4,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = "",
  disabled = false,
  intent,
  active,
  "aria-label": ariaLabel,
  children,
}: ButtonProps) => {
  const IconComponent =
    // @ts-expect-error Heroicons doesn't really support this natively in typescript
    icon && (iconType === "solid" ? SolidIcons[icon] : OutlineIcons[icon]);
  const RightIconComponent =
    rightIcon &&
    (rightIconType === "solid"
      ? // @ts-expect-error See above
        SolidIcons[rightIcon]
      : // @ts-expect-error See above
        OutlineIcons[rightIcon]);

  const commonClasses = `inline-flex align-middle justify-center items-center ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`;
  const getStyleClasses = () => {
    if (minimal) {
      return "p-1 gap-1";
    } else if (!children) {
      return "p-1 gap-1 rounded-xs inset-shadow-2xs/20 shadow-xs/30";
    } else {
      return "gap-2 px-2 py-[5px] rounded-xs inset-shadow-2xs/20 shadow-xs/30";
    }
  };

  const getColorClasses = () => {
    // In case this looks silly to you: https://tailwindcss.com/docs/detecting-classes-in-source-files#dynamic-class-names
    const colorClasses = {
      normal: {
        minimal: "hover:bg-gray-500/25",
        minimalActive: "bg-gray-500/25",
        active: "bg-stone-200 dark:bg-stone-700",
        inactive: "bg-stone-100 dark:bg-stone-600",
        normal:
          "bg-stone-100 dark:bg-stone-600 hover:bg-stone-200 dark:hover:bg-stone-700",
      },
      success: {
        minimal: "hover:bg-green-500/25",
        minimalActive: "bg-green-500/25",
        active: "bg-green-500 dark:bg-green-800",
        inactive: "bg-green-400 dark:bg-green-700",
        normal:
          "bg-green-400 dark:bg-green-700 hover:bg-green-500 dark:hover:bg-green-800",
      },
    };

    const classes = colorClasses[intent || "normal"];
    if (active === true && !disabled) {
      // Permanently highlighted
      return minimal ? classes.minimalActive : classes.active;
    } else if (active === false || disabled) {
      // Permanently not highlighted
      return minimal ? "" : classes.inactive;
    } else {
      // Highlighted on hover
      return minimal ? classes.minimal : classes.normal;
    }
  };

  const getIconClasses = (iconType: "solid" | "outline") => {
    // In case this looks silly to you: https://tailwindcss.com/docs/detecting-classes-in-source-files#dynamic-class-names
    const sizes = {
      3: "size-3",
      4: "size-4",
      5: "size-5",
    };

    const colorClasses = {
      normal: {
        solid: "fill-gray-700 dark:fill-gray-300",
        outline: "stroke-gray-700 dark:stroke-gray-300",
      },
      success: {
        solid: "fill-green-700 dark:fill-green-300",
        outline: "stroke-green-700 dark:stroke-green-300",
      },
    };

    if (!minimal) {
      switch (iconType) {
        case "solid":
          return `${sizes[iconSize]} fill-gray-700 dark:fill-gray-300`;
        case "outline":
          return `${sizes[iconSize]} stroke-gray-700 dark:stroke-gray-300`;
      }
    } else {
      switch (iconType) {
        case "solid":
          return `${sizes[iconSize]} ${colorClasses[intent || "normal"].solid}`;
        case "outline":
          return `${sizes[iconSize]} ${colorClasses[intent || "normal"].outline}`;
      }
    }
  };

  return (
    <button
      className={`${commonClasses} ${getStyleClasses()} ${getColorClasses()} ${className}`}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      {IconComponent && <IconComponent className={getIconClasses(iconType)} />}
      {children}
      {RightIconComponent && (
        <>
          <span className="flex-1" />
          <RightIconComponent className={getIconClasses(rightIconType)} />
        </>
      )}
    </button>
  );
};

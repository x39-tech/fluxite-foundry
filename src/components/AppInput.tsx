// Input with common styles that we use throughout the app

import { ComponentProps } from "react";
import { cn } from "utils/utils";
import { Input } from "./scn-ui/Input";
import { cva, VariantProps } from "class-variance-authority";

const inputVariants = cva("bg-background", {
  variants: {
    sizeVariant: {
      sm: "w-xs",
      unspecified: "",
    },
  },
  defaultVariants: {
    sizeVariant: "sm",
  },
});

export type AppInputProps = ComponentProps<"input"> &
  VariantProps<typeof inputVariants>;

export const AppInput = ({
  sizeVariant,
  className,
  ...props
}: AppInputProps) => {
  const cls = cn(inputVariants({ sizeVariant, className }));

  return <Input className={cls} {...props} />;
};

// Input with common styles that we use throughout the app

import { ComponentProps } from "react";
import { cn } from "utils/utils";
import { Input } from "./scn-ui/Input";

export const AppInput = ({ className, ...props }: ComponentProps<"input">) => {
  return <Input className={cn("bg-background w-xs", className)} {...props} />;
};

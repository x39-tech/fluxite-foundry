import { Button, ButtonProps } from "components/scn-ui/Button";
import { cn } from "utils/utils";

export const SmallIconButton = ({ className, ...props }: ButtonProps) => {
  return (
    <Button
      size="icon"
      variant="ghost"
      className={cn("size-6", className)}
      {...props}
    />
  );
};

// Reports why a field's contents were rejected, anchored to the field itself.

import { ReactNode } from "react";
import { CircleAlertIcon } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { InputValidationResult } from "utils/inputValidation";
import { Popover, PopoverAnchor, PopoverContent } from "./scn-ui/Popover";
import { Alert, AlertDescription } from "./scn-ui/Alert";

interface Props {
  result: InputValidationResult;
  side?: "top" | "right" | "bottom" | "left";
  anchorClassName?: string;
  children: ReactNode;
}

export const ValidationPopover = ({
  result,
  side,
  anchorClassName,
  children,
}: Props) => {
  const { _ } = useLingui();

  return (
    <Popover open={!result.isValid && result.feedback !== undefined}>
      <PopoverAnchor className={anchorClassName}>{children}</PopoverAnchor>
      <PopoverContent
        asChild
        side={side}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertDescription>
            {result.feedback ? (
              _(result.feedback)
            ) : (
              <Trans id="validation.unknown">An unknown error occurred.</Trans>
            )}
          </AlertDescription>
        </Alert>
      </PopoverContent>
    </Popover>
  );
};

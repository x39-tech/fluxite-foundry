import { Trans } from "@lingui/react/macro";
import { useId } from "react";
import { Label } from "components/scn-ui/Label";
import { ResolvedCommandClass } from "../stateTransformations";

interface Props {
  commandClass: ResolvedCommandClass;
}

export const CommandClassDisplay = ({ commandClass }: Props) => {
  const descId = useId();
  const idId = useId();

  const textClass = "text-sm";

  return (
    <div className="flex flex-col items-stretch gap-2">
      <div>
        <Label htmlFor={descId}>
          <Trans id="deviceClassEditor.commandClassDisplay.description">
            Description
          </Trans>
        </Label>
        <div className={textClass} id={descId}>
          {commandClass.description?.value}
        </div>
      </div>
      <div>
        <Label htmlFor={idId}>
          <Trans id="deviceClassEditor.commandClassDisplay.id">ID</Trans>
        </Label>
        <div className={textClass} id={idId}>
          {commandClass.codexId}
        </div>
      </div>
    </div>
  );
};

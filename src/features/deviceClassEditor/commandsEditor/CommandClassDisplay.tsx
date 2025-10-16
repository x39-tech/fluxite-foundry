import { useId } from "react";
import { Label } from "components/scn-ui/Label";
import { ResolvedCommandClass } from "udr/udrDatabase";

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
        <Label htmlFor={descId}>Description</Label>
        <div className={textClass} id={descId}>
          {commandClass.description}
        </div>
      </div>
      <div>
        <Label htmlFor={idId}>ID</Label>
        <div className={textClass} id={idId}>
          {commandClass.id}
        </div>
      </div>
    </div>
  );
};

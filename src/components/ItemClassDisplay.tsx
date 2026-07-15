import { ReactNode } from "react";
import { CircleQuestionMarkIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./scn-ui/Tooltip";
import { AppInput } from "./AppInput";

interface Props {
  id?: string;
  value: string;
  tooltipRenderer: () => ReactNode;
}

export const ItemClassDisplay = ({ id, value, tooltipRenderer }: Props) => {
  return (
    <div className="relative flex flex-col">
      <AppInput disabled id={id} value={value} />
      <Tooltip>
        <TooltipTrigger className="absolute right-2 top-2">
          <CircleQuestionMarkIcon className="size-5 opacity-50" />
        </TooltipTrigger>
        <TooltipContent>{tooltipRenderer()}</TooltipContent>
      </Tooltip>
    </div>
  );
};

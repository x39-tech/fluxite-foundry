import { PlusIcon } from "@heroicons/react/24/solid";
import { Button } from "./scn-ui/Button";

interface Props {
  onClick: () => void;
  text?: string;
}

export const AddItemSection = ({ onClick, text }: Props) => {
  return (
    <div className="rounded-xl border border-gray-400 dark:border-gray-600 my-2.5 mx-1 flex flex-col items-stretch overflow-hidden">
      <Button size="sm" variant="ghost" aria-label="Add Item" onClick={onClick}>
        <PlusIcon className="size-4" />
        {text}
      </Button>
    </div>
  );
};

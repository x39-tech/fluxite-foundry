import { Button } from "./Button";

interface Props {
  onClick: () => void;
  text?: string;
}

export const AddItemSection = ({ onClick, text }: Props) => {
  return (
    <div className="rounded-xl border border-gray-400 dark:border-gray-600 my-2.5 mx-1 flex flex-col items-stretch overflow-hidden">
      <Button minimal icon="PlusIcon" aria-label="Add Item" onClick={onClick}>
        {text}
      </Button>
    </div>
  );
};

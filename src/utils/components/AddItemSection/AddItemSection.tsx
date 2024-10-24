import { Button } from "@blueprintjs/core";
import "./AddItemSection.scss";

interface Props {
  onClick: () => void;
  text?: string;
}

export const AddItemSection = ({ onClick, text }: Props) => {
  return (
    <div className="add-new-item-section">
      <Button
        icon="plus"
        aria-label="Add Item"
        minimal={true}
        onClick={onClick}
      >
        {text}
      </Button>
    </div>
  );
};

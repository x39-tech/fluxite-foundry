import { Button } from "@blueprintjs/core";
import "./AddItemSection.scss";

interface Props {
  onClick: () => void;
}

export const AddItemSection = ({ onClick }: Props) => {
  return (
    <div className="add-new-item-section">
      <Button icon="plus" minimal={true} onClick={onClick} />
    </div>
  );
};

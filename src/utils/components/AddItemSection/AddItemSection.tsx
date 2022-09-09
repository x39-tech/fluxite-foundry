import { Button } from "@blueprintjs/core";
import "./AddItemSection.scss";

export interface AddItemSectionProps {
  onClick: () => void;
}

export const AddItemSection: React.FC<AddItemSectionProps> = ({ onClick }) => {
  return (
    <div className="add-new-item-section">
      <Button icon="plus" minimal={true} onClick={onClick} />
    </div>
  );
};

import { Button, Classes } from "@blueprintjs/core";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";

export interface NewScalarItemDialogProps {
  isOpen: boolean;
  onAccepted: () => void;
  onCanceled: () => void;
}

export const NewScalarItemDialog: React.FC<NewScalarItemDialogProps> = ({
  isOpen,
  onAccepted,
  onCanceled,
}) => {
  return (
    <DarkModeAwareDialog isOpen={isOpen}>
      <div className={Classes.DIALOG_BODY}>New Scalar Item</div>
      <div className={Classes.DIALOG_FOOTER}>
        <Button intent="success" icon="tick" onClick={onAccepted}>
          Add
        </Button>
        <Button onClick={onCanceled}>Cancel</Button>
      </div>
    </DarkModeAwareDialog>
  );
};

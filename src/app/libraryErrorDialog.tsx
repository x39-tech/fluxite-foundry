import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { APP_NAME, REPO_ISSUES_LINK } from "consts";

interface Props {
  show: boolean;
}

export const LibraryErrorDialog = ({ show }: Props) => {
  const [showDialog, setShowDialog] = useState(show);

  return (
    <Dialog open={showDialog} onOpenChange={(open) => setShowDialog(open)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Error</DialogTitle>
        </DialogHeader>
        <span>
          An error occurred while trying to load the default set of ESTA
          libraries. This is a bug in {APP_NAME}. Please open an issue in the{" "}
          <a href={REPO_ISSUES_LINK}>repository</a>.
        </span>
      </DialogContent>
    </Dialog>
  );
};

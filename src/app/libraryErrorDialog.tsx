import { Dialog, DialogBody } from "@blueprintjs/core";
import { useState } from "react";
import { APP_NAME, REPO_ISSUES_LINK } from "appInfo";

interface Props {
  show: boolean;
}

export const LibraryErrorDialog = ({ show }: Props) => {
  const [showDialog, setShowDialog] = useState(show);

  return (
    <Dialog isOpen={showDialog} onClose={() => setShowDialog(false)}>
      <DialogBody>
        An error occurred while trying to load the default set of ESTA
        libraries. This is a bug in {APP_NAME}. Please open an issue in the{" "}
        <a href={REPO_ISSUES_LINK}>repository</a>.
      </DialogBody>
    </Dialog>
  );
};

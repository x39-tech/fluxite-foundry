import { useState } from "react";
import { toast } from "sonner";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { EntityId } from "app/persistentState";
import { saveDocument } from "app/documentFile";
import { errorMessage } from "utils/utils";
import { Button } from "components/scn-ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";

const SAVE_FAILED = msg({
  id: "navbar.closeDocument.saveFailed",
  message: "Error saving {name}: {reason}",
});

interface Props {
  documentId: EntityId;
  /** What the document is called, for the question being asked about it. */
  name: string;
  /** Close it. */
  onConfirm: () => void;
  /** Leave it open. */
  onCancel: () => void;
}

/**
 * Asks before closing a document whose file would be left out of date, or that
 * has no file at all.
 */
export const CloseDocumentDialog = ({
  documentId,
  name,
  onConfirm,
  onCancel,
}: Props) => {
  const [saving, setSaving] = useState(false);
  const { _ } = useLingui();

  const saveAndClose = async () => {
    setSaving(true);
    try {
      if ((await saveDocument(documentId)) === "cancelled") {
        setSaving(false);
        return;
      }
    } catch (error) {
      setSaving(false);
      toast.error(
        _({ ...SAVE_FAILED, values: { name, reason: errorMessage(error) } }),
      );
      return;
    }

    onConfirm();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans id="navbar.closeDocument.title">Close {name}?</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="navbar.closeDocument.description">
              This document has unsaved changes which will be lost.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={saving} onClick={() => void saveAndClose()}>
            <Trans id="navbar.closeDocument.saveAndClose">Save and Close</Trans>
          </Button>
          <Button variant="destructive" disabled={saving} onClick={onConfirm}>
            <Trans id="navbar.closeDocument.closeWithoutSaving">
              Close Without Saving
            </Trans>
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onCancel}>
            <Trans id="navbar.closeDocument.cancel">Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

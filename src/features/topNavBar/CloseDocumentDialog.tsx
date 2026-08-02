import { useState } from "react";
import { toast } from "sonner";
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

  const saveAndClose = async () => {
    setSaving(true);
    try {
      if ((await saveDocument(documentId)) === "cancelled") {
        setSaving(false);
        return;
      }
    } catch (error) {
      setSaving(false);
      toast.error(`Error saving ${name}: ${errorMessage(error)}`);
      return;
    }

    onConfirm();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{`Close ${name}?`}</DialogTitle>
          <DialogDescription>
            This document has unsaved changes which will be lost.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={saving} onClick={() => void saveAndClose()}>
            Save and Close
          </Button>
          <Button variant="destructive" disabled={saving} onClick={onConfirm}>
            Close Without Saving
          </Button>
          <Button variant="secondary" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

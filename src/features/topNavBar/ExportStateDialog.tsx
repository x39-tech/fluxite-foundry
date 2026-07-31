import { useEffect, useState } from "react";
import { toast } from "sonner";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { Button } from "components/scn-ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { assetStorage } from "app/assetStorage";
import { saveFile } from "app/saveFile";
import {
  createStateSnapshot,
  stateSnapshotFileName,
  stateSnapshotToBlob,
} from "app/stateSnapshot";
import { VERSION as STATE_VERSION } from "app/persistentState";
import { errorMessage } from "utils/utils";
import { APP_NAME } from "consts";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportStateDialog = ({ isOpen, onClose }: Props) => {
  const [includeAssets, setIncludeAssets] = useState(true);
  const [assetInfo, setAssetInfo] = useState<
    { count: number; totalSize: number } | undefined
  >(undefined);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void assetStorage.getStorageInfo().then((info) => {
      if (!cancelled) {
        setAssetInfo(info);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const exportState = async () => {
    setExporting(true);
    try {
      const snapshot = await createStateSnapshot(includeAssets);
      await saveFile(
        stateSnapshotToBlob(snapshot),
        stateSnapshotFileName(snapshot),
        `${APP_NAME} State Snapshot`,
      );
    } catch (error) {
      toast.error(`Error exporting state: ${errorMessage(error)}`);
      return;
    } finally {
      setExporting(false);
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export State</DialogTitle>
          <DialogDescription>
            Save the entire persistent state to a file, so it can be imported
            again later to test state migrations.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="text-sm text-muted-foreground">
            {`State version ${STATE_VERSION}`}
          </div>
          <LabeledCheckbox checked={includeAssets} onChange={setIncludeAssets}>
            {`Include assets${assetInfo ? ` (${assetInfo.count}, ${formatByteSize(assetInfo.totalSize)})` : ""}`}
          </LabeledCheckbox>
        </div>
        <DialogFooter>
          <Button disabled={exporting} onClick={() => void exportState()}>
            Export
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function formatByteSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit++;
  }
  return `${unit === 0 ? size : size.toFixed(1)} ${units[unit]}`;
}

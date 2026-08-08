import { useEffect, useState } from "react";
import { toast } from "sonner";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
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

const MESSAGES = {
  fileTypeName: msg({
    id: "navbar.exportState.fileTypeName",
    message: "{appName} State Snapshot",
  }),
  exportFailed: msg({
    id: "navbar.exportState.exportFailed",
    message: "Error exporting state: {reason}",
  }),
  stateVersion: msg({
    id: "navbar.exportState.stateVersion",
    message: "State version {version}",
  }),
  includeAssets: msg({
    id: "navbar.exportState.includeAssets",
    message: "Include assets",
  }),
  // The count and size are only known once storage has been read, so this is a
  // separate message rather than an optional tail on the one above.
  includeAssetsWithInfo: msg({
    id: "navbar.exportState.includeAssetsWithInfo",
    message: "Include assets ({count}, {size})",
  }),
};

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
  const { _ } = useLingui();

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
        _({ ...MESSAGES.fileTypeName, values: { appName: APP_NAME } }),
      );
    } catch (error) {
      toast.error(
        _({
          ...MESSAGES.exportFailed,
          values: { reason: errorMessage(error) },
        }),
      );
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
          <DialogTitle>
            <Trans id="navbar.exportState.title">Export State</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="navbar.exportState.description">
              Save the entire persistent state to a file, so it can be imported
              again later to test state migrations.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="text-sm text-muted-foreground">
            {_({
              ...MESSAGES.stateVersion,
              values: { version: STATE_VERSION },
            })}
          </div>
          <LabeledCheckbox checked={includeAssets} onChange={setIncludeAssets}>
            {assetInfo
              ? _({
                  ...MESSAGES.includeAssetsWithInfo,
                  values: {
                    count: assetInfo.count,
                    size: formatByteSize(assetInfo.totalSize),
                  },
                })
              : _(MESSAGES.includeAssets)}
          </LabeledCheckbox>
        </div>
        <DialogFooter>
          <Button disabled={exporting} onClick={() => void exportState()}>
            <Trans id="navbar.exportState.export">Export</Trans>
          </Button>
          <Button variant="secondary" onClick={onClose}>
            <Trans id="navbar.exportState.cancel">Cancel</Trans>
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

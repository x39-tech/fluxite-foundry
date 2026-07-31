import { useState } from "react";
import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { AppInput } from "components/AppInput";
import { FieldSet } from "components/FieldSet";
import { Alert, AlertDescription, AlertTitle } from "components/scn-ui/Alert";
import { Button } from "components/scn-ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { Label } from "components/scn-ui/Label";
import {
  applyStateSnapshot,
  parseStateSnapshot,
  StateSnapshot,
} from "app/stateSnapshot";
import { VERSION as STATE_VERSION } from "app/persistentState";
import { errorMessage, reloadApp } from "utils/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportStateDialog = ({ isOpen, onClose }: Props) => {
  const [snapshot, setSnapshot] = useState<StateSnapshot | undefined>(
    undefined,
  );
  const [parseError, setParseError] = useState<string | undefined>(undefined);
  const [importing, setImporting] = useState(false);

  const selectFile = async (file: File | null) => {
    setSnapshot(undefined);
    setParseError(undefined);
    if (!file) {
      return;
    }

    try {
      setSnapshot(parseStateSnapshot(await file.text()));
    } catch (error) {
      setParseError(errorMessage(error));
    }
  };

  const importState = async () => {
    if (!snapshot) {
      return;
    }

    setImporting(true);
    try {
      await applyStateSnapshot(snapshot);
    } catch (error) {
      setImporting(false);
      toast.error(`Error importing state: ${errorMessage(error)}`);
      return;
    }

    // The imported state is migrated and validated on the way back in, so the
    // app has to be reloaded to pick it up.
    reloadApp();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Import State</DialogTitle>
          <DialogDescription>
            Load a previously exported state file. It is migrated to the current
            state version as it would be on any other load.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <FieldSet>
            <Label htmlFor="import-state-file">
              Select state file to import
            </Label>
            <AppInput
              id="import-state-file"
              type="file"
              accept=".json,application/json"
              onChange={(event) =>
                void selectFile(event.currentTarget.files?.item(0) ?? null)
              }
            />
          </FieldSet>
          {parseError && (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>The selected file cannot be imported.</AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
          {snapshot && <SnapshotSummary snapshot={snapshot} />}
          <Alert>
            <TriangleAlertIcon />
            <AlertTitle>
              Importing discards everything currently in the app.
            </AlertTitle>
            <AlertDescription>
              All editors and settings are replaced, and the app reloads.
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button
            disabled={!snapshot || importing}
            onClick={() => void importState()}
          >
            Import
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SnapshotSummary = ({ snapshot }: { snapshot: StateSnapshot }) => {
  const migration =
    snapshot.stateVersion === STATE_VERSION
      ? "no migration needed"
      : `will migrate to v${STATE_VERSION}`;

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <SummaryRow label="State version">
        {`v${snapshot.stateVersion} (${migration})`}
      </SummaryRow>
      <SummaryRow label="Assets">
        {snapshot.assets
          ? `${snapshot.assets.meta.length} included (replaces stored assets)`
          : "not included (stored assets kept)"}
      </SummaryRow>
      {snapshot.exportedAt && (
        <SummaryRow label="Exported">
          {new Date(snapshot.exportedAt).toLocaleString()}
        </SummaryRow>
      )}
      {snapshot.appVersion && (
        <SummaryRow label="App version">{snapshot.appVersion}</SummaryRow>
      )}
    </dl>
  );
};

const SummaryRow = ({
  label,
  children,
}: {
  label: string;
  children: string;
}) => (
  <>
    <dt className="text-muted-foreground">{label}</dt>
    <dd>{children}</dd>
  </>
);

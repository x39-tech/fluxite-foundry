import { ReactNode, useState } from "react";
import { CircleAlertIcon, TriangleAlertIcon } from "lucide-react";
import { toast } from "sonner";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
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

const MESSAGES = {
  importFailed: msg({
    id: "navbar.importState.importFailed",
    message: "Error importing state: {reason}",
  }),
  versionCurrent: msg({
    id: "navbar.importState.summary.versionCurrent",
    message: "v{version} (no migration needed)",
  }),
  versionWillMigrate: msg({
    id: "navbar.importState.summary.versionWillMigrate",
    message: "v{version} (will migrate to v{currentVersion})",
  }),
  assetsIncluded: msg({
    id: "navbar.importState.summary.assetsIncluded",
    message: "{count} included (replaces stored assets)",
  }),
  assetsNotIncluded: msg({
    id: "navbar.importState.summary.assetsNotIncluded",
    message: "not included (stored assets kept)",
  }),
};

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
  const { _ } = useLingui();

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
      toast.error(
        _({
          ...MESSAGES.importFailed,
          values: { reason: errorMessage(error) },
        }),
      );
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
          <DialogTitle>
            <Trans id="navbar.importState.title">Import State</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="navbar.importState.description">
              Load a previously exported state file. It is migrated to the
              current state version.
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <FieldSet>
            <Label htmlFor="import-state-file">
              <Trans id="navbar.importState.selectFile">
                Select state file to import
              </Trans>
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
              <AlertTitle>
                <Trans id="navbar.importState.parseFailed">
                  The selected file cannot be imported.
                </Trans>
              </AlertTitle>
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}
          {snapshot && <SnapshotSummary snapshot={snapshot} />}
          <Alert>
            <TriangleAlertIcon />
            <AlertTitle>
              <Trans id="navbar.importState.warningTitle">
                Importing discards everything currently in the app.
              </Trans>
            </AlertTitle>
            <AlertDescription>
              <Trans id="navbar.importState.warningDescription">
                All editors and settings will be replaced, and the app will
                reload.
              </Trans>
            </AlertDescription>
          </Alert>
        </div>
        <DialogFooter>
          <Button
            disabled={!snapshot || importing}
            onClick={() => void importState()}
          >
            <Trans id="navbar.importState.import">Import</Trans>
          </Button>
          <Button variant="secondary" onClick={onClose}>
            <Trans id="navbar.importState.cancel">Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SnapshotSummary = ({ snapshot }: { snapshot: StateSnapshot }) => {
  const { _, i18n } = useLingui();

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <SummaryRow
        label={
          <Trans id="navbar.importState.summary.stateVersionLabel">
            State version
          </Trans>
        }
      >
        {snapshot.stateVersion === STATE_VERSION
          ? _({
              ...MESSAGES.versionCurrent,
              values: { version: snapshot.stateVersion },
            })
          : _({
              ...MESSAGES.versionWillMigrate,
              values: {
                version: snapshot.stateVersion,
                currentVersion: STATE_VERSION,
              },
            })}
      </SummaryRow>
      <SummaryRow
        label={
          <Trans id="navbar.importState.summary.assetsLabel">Assets</Trans>
        }
      >
        {snapshot.assets
          ? _({
              ...MESSAGES.assetsIncluded,
              values: { count: snapshot.assets.meta.length },
            })
          : _(MESSAGES.assetsNotIncluded)}
      </SummaryRow>
      {snapshot.exportedAt && (
        <SummaryRow
          label={
            <Trans id="navbar.importState.summary.exportedLabel">
              Exported
            </Trans>
          }
        >
          {i18n.date(new Date(snapshot.exportedAt), {
            dateStyle: "medium",
            timeStyle: "medium",
          })}
        </SummaryRow>
      )}
      {snapshot.appVersion && (
        <SummaryRow
          label={
            <Trans id="navbar.importState.summary.appVersionLabel">
              App version
            </Trans>
          }
        >
          {snapshot.appVersion}
        </SummaryRow>
      )}
    </dl>
  );
};

const SummaryRow = ({
  label,
  children,
}: {
  label: ReactNode;
  children: ReactNode;
}) => (
  <>
    <dt className="text-muted-foreground">{label}</dt>
    <dd>{children}</dd>
  </>
);

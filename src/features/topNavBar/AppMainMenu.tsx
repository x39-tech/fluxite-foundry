import { useState } from "react";
import {
  CircleQuestionMarkIcon,
  DownloadIcon,
  FileTextIcon,
  FolderOpenIcon,
  HardDriveDownloadIcon,
  HardDriveUploadIcon,
  RefreshCwIcon,
  SaveIcon,
  SettingsIcon,
  SlidersVerticalIcon,
  UploadIcon,
  WrenchIcon,
} from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
import { getMigrationReport, openMigrationReport } from "app/migrationReport";
import {
  openDocumentFile,
  saveDocument,
  saveDocumentAs,
} from "app/documentFile";
import { useCurrentDocumentId } from "app/documents";
import { EntityId } from "app/persistentState";
import { checkForUpdateInteractively } from "features/updater/updatePrompt";
import { errorMessage } from "utils/utils";
import { APP_NAME } from "consts";
import { AboutDialog } from "./AboutDialog";
import { ImportFluxiteCodexDialog } from "./ImportFluxiteCodexDialog";
import { ExportFluxiteCodexDialog } from "./ExportFluxiteCodexDialog";
import { SettingsDialog } from "./SettingsDialog";
import { ExportStateDialog } from "./ExportStateDialog";
import { ImportStateDialog } from "./ImportStateDialog";
import { UndoRedoMenuItems } from "./UndoRedoMenuItems";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "components/scn-ui/DropdownMenu";
import { Button } from "components/scn-ui/Button";

const MESSAGES = {
  menuLabel: msg({ id: "navbar.mainMenu.label", message: "App Menu" }),
  openFailed: msg({
    id: "navbar.mainMenu.openFailed",
    message: "Error opening document: {reason}",
  }),
  saveFailed: msg({
    id: "navbar.mainMenu.saveFailed",
    message: "Error saving document: {reason}",
  }),
  noMigrationReport: msg({
    id: "navbar.mainMenu.noMigrationReport",
    message: "No migration report available",
  }),
  migrationReportBlocked: msg({
    id: "navbar.mainMenu.migrationReportBlocked",
    message: "Failed to open migration report. Pop-ups may be blocked.",
  }),
  migrationReportFailed: msg({
    id: "navbar.mainMenu.migrationReportFailed",
    message: "Failed to open migration report: {reason}",
  }),
};

export const AppMainMenu = () => {
  const currentDocumentId = useCurrentDocumentId();
  const [importDialogIsOpen, setImportDialogIsOpen] = useState(false);
  const [exportDialogIsOpen, setExportDialogIsOpen] = useState(false);
  const [settingsDialogIsOpen, setSettingsDialogIsOpen] = useState(false);
  const [aboutDialogIsOpen, setAboutDialogIsOpen] = useState(false);
  const [exportStateDialogIsOpen, setExportStateDialogIsOpen] = useState(false);
  const [importStateDialogIsOpen, setImportStateDialogIsOpen] = useState(false);
  const { _ } = useLingui();

  const openDocument = async () => {
    try {
      await openDocumentFile();
    } catch (error) {
      toast.error(
        _({ ...MESSAGES.openFailed, values: { reason: errorMessage(error) } }),
      );
    }
  };

  const save = async (documentId: EntityId, alwaysAsk: boolean) => {
    try {
      await (alwaysAsk ? saveDocumentAs : saveDocument)(documentId);
    } catch (error) {
      toast.error(
        _({ ...MESSAGES.saveFailed, values: { reason: errorMessage(error) } }),
      );
    }
  };

  // In the browser, we just use "Save" to mean "Save As" in all cases and there
  // is only one menu option. In Tauri, we expose both Save and Save As.

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            aria-label={_(MESSAGES.menuLabel)}
          >
            <SlidersVerticalIcon className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <UndoRedoMenuItems />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void openDocument()}>
            <FolderOpenIcon className="size-5" />
            <Trans id="navbar.mainMenu.open">Open...</Trans>
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={currentDocumentId === undefined}
            onClick={() =>
              currentDocumentId && void save(currentDocumentId, false)
            }
          >
            <SaveIcon className="size-5" />
            <Trans id="navbar.mainMenu.save">Save</Trans>
          </DropdownMenuItem>
          {isTauri() && (
            <DropdownMenuItem
              disabled={currentDocumentId === undefined}
              onClick={() =>
                currentDocumentId && void save(currentDocumentId, true)
              }
            >
              <SaveIcon className="size-5" />
              <Trans id="navbar.mainMenu.saveAs">Save As...</Trans>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setImportDialogIsOpen(true)}>
            <DownloadIcon className="size-5" />
            <Trans id="navbar.mainMenu.importCodex">
              Import Fluxite Codex...
            </Trans>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportDialogIsOpen(true)}>
            <UploadIcon className="size-5" />
            <Trans id="navbar.mainMenu.exportCodex">
              Export Fluxite Codex...
            </Trans>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsDialogIsOpen(true)}>
            <SettingsIcon className="size-5" />
            <Trans id="navbar.mainMenu.settings">Settings...</Trans>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex gap-2">
              <WrenchIcon className="size-5 text-muted-foreground" />
              <Trans id="navbar.mainMenu.debug">Debug</Trans>
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => {
                  void (async () => {
                    if (!getMigrationReport()) {
                      toast.error(_(MESSAGES.noMigrationReport));
                      return;
                    }
                    try {
                      if (!(await openMigrationReport())) {
                        toast.error(_(MESSAGES.migrationReportBlocked));
                      }
                    } catch (error) {
                      toast.error(
                        _({
                          ...MESSAGES.migrationReportFailed,
                          values: { reason: errorMessage(error) },
                        }),
                      );
                    }
                  })();
                }}
              >
                <FileTextIcon className="size-5" />
                <Trans id="navbar.mainMenu.viewMigrationReport">
                  View Migration Report
                </Trans>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setExportStateDialogIsOpen(true)}
              >
                <HardDriveUploadIcon className="size-5" />
                <Trans id="navbar.mainMenu.exportState">Export State...</Trans>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setImportStateDialogIsOpen(true)}
              >
                <HardDriveDownloadIcon className="size-5" />
                <Trans id="navbar.mainMenu.importState">Import State...</Trans>
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {isTauri() && (
            <DropdownMenuItem
              onClick={() => void checkForUpdateInteractively()}
            >
              <RefreshCwIcon className="size-5" />
              <Trans id="navbar.mainMenu.checkForUpdates">
                Check for Updates...
              </Trans>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setAboutDialogIsOpen(true)}>
            <CircleQuestionMarkIcon className="size-5" />
            <Trans id="navbar.mainMenu.about">About {APP_NAME}</Trans>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {importDialogIsOpen && (
        <ImportFluxiteCodexDialog
          isOpen={true}
          onClose={() => setImportDialogIsOpen(false)}
        />
      )}
      {exportDialogIsOpen && (
        <ExportFluxiteCodexDialog
          isOpen={true}
          onClose={() => setExportDialogIsOpen(false)}
        />
      )}
      {settingsDialogIsOpen && (
        <SettingsDialog
          isOpen={true}
          onClose={() => setSettingsDialogIsOpen(false)}
        />
      )}
      {exportStateDialogIsOpen && (
        <ExportStateDialog
          isOpen={true}
          onClose={() => setExportStateDialogIsOpen(false)}
        />
      )}
      {importStateDialogIsOpen && (
        <ImportStateDialog
          isOpen={true}
          onClose={() => setImportStateDialogIsOpen(false)}
        />
      )}
      {aboutDialogIsOpen && (
        <AboutDialog
          isOpen={aboutDialogIsOpen}
          onClose={() => setAboutDialogIsOpen(false)}
        />
      )}
    </>
  );
};

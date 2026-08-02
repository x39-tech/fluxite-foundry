import { useState } from "react";
import {
  CircleQuestionMarkIcon,
  DownloadIcon,
  FileTextIcon,
  HardDriveDownloadIcon,
  HardDriveUploadIcon,
  RefreshCwIcon,
  SettingsIcon,
  SlidersVerticalIcon,
  UploadIcon,
  WrenchIcon,
} from "lucide-react";
import { isTauri } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { getMigrationReport, openMigrationReport } from "app/migrationReport";
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

export const AppMainMenu = () => {
  const [importDialogIsOpen, setImportDialogIsOpen] = useState(false);
  const [exportDialogIsOpen, setExportDialogIsOpen] = useState(false);
  const [settingsDialogIsOpen, setSettingsDialogIsOpen] = useState(false);
  const [aboutDialogIsOpen, setAboutDialogIsOpen] = useState(false);
  const [exportStateDialogIsOpen, setExportStateDialogIsOpen] = useState(false);
  const [importStateDialogIsOpen, setImportStateDialogIsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            aria-label="App Menu"
          >
            <SlidersVerticalIcon className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <UndoRedoMenuItems />
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setImportDialogIsOpen(true)}>
            <DownloadIcon className="size-5" />
            Import Fluxite Codex...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportDialogIsOpen(true)}>
            <UploadIcon className="size-5" />
            Export Fluxite Codex...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsDialogIsOpen(true)}>
            <SettingsIcon className="size-5" />
            Settings...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex gap-2">
              <WrenchIcon className="size-5 text-muted-foreground" />
              Debug
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => {
                  void (async () => {
                    if (!getMigrationReport()) {
                      toast.error("No migration report available");
                      return;
                    }
                    try {
                      if (!(await openMigrationReport())) {
                        toast.error(
                          "Failed to open migration report. Pop-ups may be blocked.",
                        );
                      }
                    } catch (error) {
                      toast.error(
                        `Failed to open migration report: ${errorMessage(error)}`,
                      );
                    }
                  })();
                }}
              >
                <FileTextIcon className="size-5" />
                View Migration Report
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setExportStateDialogIsOpen(true)}
              >
                <HardDriveUploadIcon className="size-5" />
                Export State...
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setImportStateDialogIsOpen(true)}
              >
                <HardDriveDownloadIcon className="size-5" />
                Import State...
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          {isTauri() && (
            <DropdownMenuItem
              onClick={() => void checkForUpdateInteractively()}
            >
              <RefreshCwIcon className="size-5" />
              Check for Updates...
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setAboutDialogIsOpen(true)}>
            <CircleQuestionMarkIcon className="size-5" />
            {`About ${APP_NAME}`}
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

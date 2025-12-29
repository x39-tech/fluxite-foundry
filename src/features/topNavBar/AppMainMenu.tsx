import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  EllipsisHorizontalIcon,
  QuestionMarkCircleIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/24/solid";
import { CogIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import {
  getMigrationReport,
  openMigrationReportInNewTab,
} from "app/migrationReport";
import { APP_NAME } from "consts";
import { AboutDialog } from "./AboutDialog";
import { ImportFluxiteCodexDialog } from "./ImportFluxiteCodexDialog";
import { ExportFluxiteCodexDialog } from "./ExportFluxiteCodexDialog";
import { SettingsDialog } from "./SettingsDialog";
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="secondary"
            className="size-8"
            aria-label="App Menu"
          >
            <EllipsisHorizontalIcon className="size-6" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuItem onClick={() => setImportDialogIsOpen(true)}>
            <ArrowDownTrayIcon className="size-5" />
            Import Fluxite Codex...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportDialogIsOpen(true)}>
            <ArrowUpTrayIcon className="size-5" />
            Export Fluxite Codex...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsDialogIsOpen(true)}>
            <CogIcon className="size-5" />
            Settings...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="flex gap-2">
              <WrenchScrewdriverIcon className="size-5 text-muted-foreground" />
              Debug
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem
                onClick={() => {
                  if (!getMigrationReport()) {
                    toast.error("No migration report available");
                    return;
                  }
                  if (!openMigrationReportInNewTab()) {
                    toast.error(
                      "Failed to open migration report. Pop-ups may be blocked.",
                    );
                  }
                }}
              >
                <DocumentTextIcon className="size-5" />
                View Migration Report
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuItem onClick={() => setAboutDialogIsOpen(true)}>
            <QuestionMarkCircleIcon className="size-5" />
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
      {aboutDialogIsOpen && (
        <AboutDialog
          isOpen={aboutDialogIsOpen}
          onClose={() => setAboutDialogIsOpen(false)}
        />
      )}
    </>
  );
};

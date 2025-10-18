import { useState } from "react";
import {
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
  EllipsisHorizontalIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/solid";
import { CogIcon } from "@heroicons/react/24/outline";
import { APP_NAME } from "appInfo";
import { AboutDialog } from "./AboutDialog";
import { ImportUdrDialog } from "./ImportUdrDialog";
import { ExportUdrDialog } from "./ExportUdrDialog";
import { SettingsDialog } from "./SettingsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "components/scn-ui/DropdownMenu";
import { Button } from "components/scn-ui/Button";

export const AppMainMenu = () => {
  const [importUdrDialogIsOpen, setImportUdrDialogIsOpen] = useState(false);
  const [exportUdrDialogIsOpen, setExportUdrDialogIsOpen] = useState(false);
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
          <DropdownMenuItem onClick={() => setImportUdrDialogIsOpen(true)}>
            <ArrowDownTrayIcon className="size-5" />
            Import UDR...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setExportUdrDialogIsOpen(true)}>
            <ArrowUpTrayIcon className="size-5" />
            Export UDR...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSettingsDialogIsOpen(true)}>
            <CogIcon className="size-5" />
            Settings...
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setAboutDialogIsOpen(true)}>
            <QuestionMarkCircleIcon className="size-5" />
            {`About ${APP_NAME}`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {importUdrDialogIsOpen && (
        <ImportUdrDialog
          isOpen={true}
          onClose={() => setImportUdrDialogIsOpen(false)}
        />
      )}
      {exportUdrDialogIsOpen && (
        <ExportUdrDialog
          isOpen={true}
          onClose={() => setExportUdrDialogIsOpen(false)}
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

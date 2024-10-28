import { useState } from "react";
import { Button, Icon, Menu, MenuDivider } from "@blueprintjs/core";
import { MenuItem2, Popover2 } from "@blueprintjs/popover2";
import { APP_NAME } from "appInfo";
import { setDarkMode, useDarkMode } from "app/store";
import { AboutDialog } from "./AboutDialog";
import { ImportUdrDialog } from "./ImportUdrDialog";
import { ExportUdrDialog } from "./ExportUdrDialog";

export const AppMainMenu = () => {
  const darkMode = useDarkMode();

  const [importUdrDialogIsOpen, setImportUdrDialogIsOpen] = useState(false);
  const [exportUdrDialogIsOpen, setExportUdrDialogIsOpen] = useState(false);
  const [aboutDialogIsOpen, setAboutDialogIsOpen] = useState(false);

  const mainMenu = (
    <Menu>
      <MenuItem2
        text="Import UDR..."
        icon="import"
        onClick={() => setImportUdrDialogIsOpen(true)}
      />
      <MenuItem2
        text="Export UDR..."
        icon="export"
        onClick={() => setExportUdrDialogIsOpen(true)}
      />
      <MenuDivider />
      <MenuItem2 text="Settings" icon="cog">
        <MenuItem2
          text="Dark Mode"
          icon="moon"
          labelElement={checkedIf(darkMode)}
          onClick={() => setDarkMode(!darkMode)}
        />
      </MenuItem2>
      <MenuItem2
        text={`About ${APP_NAME}`}
        icon="help"
        onClick={() => setAboutDialogIsOpen(true)}
      />
    </Menu>
  );

  return (
    <>
      <Popover2 content={mainMenu}>
        <Button icon="more" />
      </Popover2>
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
      {aboutDialogIsOpen && (
        <AboutDialog
          isOpen={aboutDialogIsOpen}
          onClose={() => setAboutDialogIsOpen(false)}
        />
      )}
    </>
  );
};

function checkedIf(condition: boolean): JSX.Element {
  return condition ? <Icon icon="tick" /> : <></>;
}

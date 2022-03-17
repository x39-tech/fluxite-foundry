import React from "react";
import { Button, Icon, Menu, MenuItem, Popover } from "@blueprintjs/core";
// Note: Popover is deprecated, but I can't figure out how to make Popover2 look right and have the
// proper animations etc.
// import { Popover2 } from "@blueprintjs/popover2";

export interface AppSettings {
  darkMode: boolean;
  threeDViewEnabled: boolean;
}

export const defaultAppSettings: AppSettings = {
  darkMode: false,
  threeDViewEnabled: false,
};

export interface SettingsMenuProps {
  settings: AppSettings;
  onSettingsChanged: (newSettings: AppSettings) => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
  settings,
  onSettingsChanged,
}) => {
  const checkedIf = (condition: boolean) => {
    return condition ? <Icon icon="tick" /> : <></>;
  };

  const settingsMenu = (
    <Menu>
      <MenuItem
        text="Dark Mode"
        icon="moon"
        labelElement={checkedIf(settings.darkMode)}
        onClick={() => {
          onSettingsChanged({
            ...settings,
            darkMode: !settings.darkMode,
          });
        }}
      />
      <MenuItem
        text="Show 3D View"
        icon="cube"
        labelElement={checkedIf(settings.threeDViewEnabled)}
        onClick={() => {
          onSettingsChanged({
            ...settings,
            threeDViewEnabled: !settings.threeDViewEnabled,
          });
        }}
      />
    </Menu>
  );

  return (
    <Popover content={settingsMenu} placement="bottom-end">
      <Button icon="cog" />
    </Popover>
  );
};

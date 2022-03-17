import React from "react";
import { Button, Menu, MenuItem, Popover } from "@blueprintjs/core";
// Note: Popover is deprecated, but I can't figure out how to make Popover2 look right and have the
// proper animations etc.
// import { Popover2 } from "@blueprintjs/popover2";

export interface AppSettings {
  threeDViewEnabled: boolean;
}

export const defaultAppSettings: AppSettings = {
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
  const settingsMenu = (
    <Menu>
      <MenuItem
        text="Show 3D View"
        icon={settings.threeDViewEnabled ? "tick" : "blank"}
        onClick={() => {
          onSettingsChanged({
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

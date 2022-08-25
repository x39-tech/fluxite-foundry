import React from "react";
import { Button, Icon, Menu } from "@blueprintjs/core";
import { darkModeToggled, threeDViewToggled } from "./appSettingsSlice";
import { MenuItem2, Popover2 } from "@blueprintjs/popover2";
import { useAppDispatch, useAppSelector } from "app/hooks";

export const SettingsMenu: React.FC<{}> = () => {
  const settings = useAppSelector((state) => state.appSettings);
  const dispatch = useAppDispatch();

  const checkedIf = (condition: boolean) => {
    return condition ? <Icon icon="tick" /> : <></>;
  };

  const settingsMenu = (
    <Menu>
      <MenuItem2
        text="Dark Mode"
        icon="moon"
        labelElement={checkedIf(settings.darkMode)}
        onClick={() => {
          dispatch(darkModeToggled());
        }}
      />
      <MenuItem2
        text="Show 3D View"
        icon="cube"
        labelElement={checkedIf(settings.threeDViewEnabled)}
        onClick={() => {
          dispatch(threeDViewToggled());
        }}
      />
    </Menu>
  );

  return (
    <Popover2 content={settingsMenu} placement="bottom-end">
      <Button icon="cog" />
    </Popover2>
  );
};

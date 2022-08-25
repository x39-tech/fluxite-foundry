import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button, Icon, Menu, MenuItem, Popover } from "@blueprintjs/core";
import { RootState } from "app/store";
import { darkModeToggled, threeDViewToggled } from "./appSettingsSlice";
// TODO: Popover is deprecated, but I can't figure out how to make Popover2 look right and have the
// proper animations etc.
// import { Popover2 } from "@blueprintjs/popover2";

export const SettingsMenu: React.FC<{}> = () => {
  const settings = useSelector((state: RootState) => {
    return state.appSettings;
  });

  const dispatch = useDispatch();

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
          dispatch(darkModeToggled());
        }}
      />
      <MenuItem
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
    <Popover content={settingsMenu} placement="bottom-end">
      <Button icon="cog" />
    </Popover>
  );
};

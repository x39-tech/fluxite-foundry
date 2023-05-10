import { Menu } from "@blueprintjs/core";
import { MenuItem2 } from "@blueprintjs/popover2";

import { WIDGETS } from "./widgets";

export interface NewWidgetMenuProps {
  onNewWidgetSelected: (id: string, name: string) => void;
}

export const NewWidgetMenu: React.FC<NewWidgetMenuProps> = ({
  onNewWidgetSelected,
}) => {
  return (
    <Menu>
      {Object.entries(WIDGETS).map(([widgetId, widgetDesc]) => {
        return (
          <MenuItem2
            text={widgetDesc.name}
            onClick={() => onNewWidgetSelected(widgetId, widgetDesc.name)}
          />
        );
      })}
    </Menu>
  );
};

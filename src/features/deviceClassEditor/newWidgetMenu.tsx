import { Menu } from "@blueprintjs/core";
import { MenuItem2 } from "@blueprintjs/popover2";

import { WIDGETS } from "./widgets";

interface Props {
  onNewWidgetSelected: (id: string, name: string) => void;
}

export const NewWidgetMenu = ({ onNewWidgetSelected }: Props) => {
  return (
    <Menu>
      {Object.entries(WIDGETS).map(([widgetId, widgetDesc]) => {
        return (
          <MenuItem2
            key={widgetId}
            text={widgetDesc.name}
            onClick={() => onNewWidgetSelected(widgetId, widgetDesc.name)}
          />
        );
      })}
    </Menu>
  );
};

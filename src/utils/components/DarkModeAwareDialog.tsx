import { Classes, Dialog, DialogProps } from "@blueprintjs/core";
import { useDarkMode } from "app/store";

export const DarkModeAwareDialog = (props: DialogProps) => {
  const isInDarkMode = useDarkMode();

  return (
    <Dialog className={isInDarkMode ? `dark ${Classes.DARK}` : ""} {...props} />
  );
};

import { Classes, Dialog, DialogProps } from "@blueprintjs/core";
import { useAppSelector } from "app/hooks";

export const DarkModeAwareDialog: React.FC<DialogProps> = (props) => {
  const isInDarkMode = useAppSelector((state) => state.appSettings.darkMode);

  return <Dialog className={isInDarkMode ? Classes.DARK : ""} {...props} />;
};

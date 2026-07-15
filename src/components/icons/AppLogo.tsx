// Used both in the app and as the favicon
import Mark from "../../../public/icon.svg?react";

interface AppLogoProps {
  className?: string;
}

export const AppLogo = ({ className }: AppLogoProps) => (
  <Mark role="img" aria-label="Fluxite Foundry" className={className} />
);

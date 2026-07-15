import Mark from "./AppLogoMark.svg?react";

interface AppLogoProps {
  className?: string;
}

export const AppLogo = ({ className }: AppLogoProps) => (
  <Mark role="img" aria-label="Fluxite Foundry" className={className} />
);

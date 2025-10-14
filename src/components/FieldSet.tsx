import { ReactNode } from "react";

export const FieldSet = ({ children }: { children: ReactNode[] }) => {
  return <div className="flex flex-col gap-2">{children}</div>;
};

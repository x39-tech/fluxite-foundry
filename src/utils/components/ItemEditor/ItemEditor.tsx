import { Collapse } from "@blueprintjs/core";
import { useState } from "react";
import { Button } from "utils/components/Button";

interface Props {
  title: string;
  expanded?: boolean;
  onDelete: () => void;
  children: React.ReactNode;
}

export const ItemEditor = ({
  title,
  expanded = false,
  onDelete,
  children,
}: Props) => {
  const [isExpanded, setExpanded] = useState(expanded || false);

  return (
    <div
      className={
        "rounded-sm py-2 pl-3 pr-2 m-1 flex flex-col bg-gray-200 dark:bg-gray-800"
      }
    >
      <div className="flex items-center gap-1">
        <Button
          aria-label={`Expand ${title}`}
          icon={isExpanded ? "MinusIcon" : "PlusIcon"}
          minimal={true}
          className="opacity-80"
          onClick={() => setExpanded(!isExpanded)}
        />
        <h2 className="text-lg">{title}</h2>
        <div className="flex-grow" />
        <Button icon="TrashIcon" minimal={true} onClick={onDelete} />
      </div>
      <Collapse isOpen={isExpanded}>{children}</Collapse>
    </div>
  );
};

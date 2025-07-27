import { useState } from "react";
import { Button } from "../Button";
import { TrashIcon } from "@heroicons/react/24/solid";
import { VerticalDivider } from "../VerticalDivider";

interface Props {
  name: string;
  id: string;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EditorTitleTab = ({
  name,
  id,
  active,
  onSelect,
  onDelete,
}: Props) => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <Button
        minimal
        active={active}
        onClick={() => {
          onSelect(id);
        }}
        onMouseEnter={() => {
          setHovered(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
        }}
      >
        <div className="flex gap-2 mx-2 my-0.5">
          {name}
          <TrashIcon
            className={`size-4 ${hovered ? "visible" : "invisible"}`}
            onClick={(e) => {
              e.stopPropagation();
              onDelete(id);
            }}
          />
        </div>
      </Button>
      <VerticalDivider />
    </>
  );
};

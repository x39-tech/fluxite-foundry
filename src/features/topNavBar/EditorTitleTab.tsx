import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/solid";
import { Toggle } from "components/scn-ui/Toggle";
import { Button } from "components/scn-ui/Button";
import { NavbarDivider } from "./NavbarDivider";

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
      <div
        className="relative flex items-center"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <Toggle
          className="flex-1 pr-12"
          pressed={active}
          onClick={() => onSelect(id)}
        >
          {name}
        </Toggle>
        <Button
          size="icon"
          aria-label="Delete Editor"
          variant="ghost"
          className={`absolute right-1 ${hovered ? "visible" : "invisible"}`}
          onClick={() => onDelete(id)}
        >
          <TrashIcon className="size-4" />
        </Button>
      </div>
      <NavbarDivider />
    </>
  );
};

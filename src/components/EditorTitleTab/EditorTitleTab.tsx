import { useState } from "react";
import { TrashIcon } from "@heroicons/react/24/solid";
import { Toggle } from "components/scn-ui/Toggle";
import { Separator } from "components/scn-ui/Separator";
import { Button } from "components/scn-ui/Button";

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
      <Toggle
        pressed={active}
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
        {name}
        <Button
          size="icon"
          aria-label="Delete Editor"
          variant="ghost"
          className={hovered ? "visible" : "invisible"}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(id);
          }}
        >
          <TrashIcon className="size-4" />
        </Button>
      </Toggle>
      <div className="h-[50%] mx-3">
        <Separator orientation="vertical" />
      </div>
    </>
  );
};

import { useMemo, useState } from "react";
import { Trash2Icon, SpotlightIcon } from "lucide-react";
import { DocumentType } from "app/persistentState";
import { Toggle } from "components/scn-ui/Toggle";
import { Button } from "components/scn-ui/Button";
import { NavbarDivider } from "./NavbarDivider";

interface Props {
  name: string;
  type: DocumentType | undefined;
  id: string;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EditorTitleTab = ({
  name,
  type,
  id,
  active,
  onSelect,
  onDelete,
}: Props) => {
  const [hovered, setHovered] = useState(false);

  const leftSideElement = useMemo(() => {
    switch (type) {
      case "deviceClass":
        return <SpotlightIcon className="size-4" />;
      default:
        return <></>;
    }
  }, [type]);

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
          {leftSideElement}
          {name}
        </Toggle>
        <Button
          size="icon"
          aria-label="Delete Editor"
          variant="ghost"
          className={`absolute right-1 ${hovered ? "visible" : "invisible"}`}
          onClick={() => onDelete(id)}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
      <NavbarDivider />
    </>
  );
};

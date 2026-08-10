import { useMemo, useState } from "react";
import { Trash2Icon, SpotlightIcon } from "lucide-react";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { DocumentType, EntityId } from "app/persistentState";
import { useDocumentIsDirty } from "app/documentFile";
import { Toggle } from "components/scn-ui/Toggle";
import { Button } from "components/scn-ui/Button";
import { NavbarDivider } from "./NavbarDivider";

const MESSAGES = {
  unsavedChanges: msg({
    id: "navbar.editorTab.unsavedChanges",
    message: "Unsaved changes",
  }),
  deleteEditor: msg({
    id: "navbar.editorTab.deleteEditor",
    message: "Delete Editor",
  }),
};

interface Props {
  name: string;
  type: DocumentType | undefined;
  id: EntityId;
  active: boolean;
  onSelect: (id: EntityId) => void;
  onDelete: (id: EntityId) => void;
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
  const { _ } = useLingui();
  const dirty = useDocumentIsDirty(id);

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
          {dirty && (
            <span
              className="size-2 rounded-full bg-primary"
              role="img"
              aria-label={_(MESSAGES.unsavedChanges)}
            />
          )}
        </Toggle>
        <Button
          size="icon"
          aria-label={_(MESSAGES.deleteEditor)}
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

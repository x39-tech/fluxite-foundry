import React, { useState } from "react";
import { Button, Icon, Navbar } from "@blueprintjs/core";
import "./EditorTitleTab.css";

export interface EditorTitleTabProps {
  name: string;
  id: string;
  active: boolean;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

export const EditorTitleTab: React.FC<EditorTitleTabProps> = ({
  name,
  id,
  active,
  onSelect,
  onDelete,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <Button
        minimal
        active={active}
        className="editor-selector-button"
        onClick={() => {onSelect(id)}}
        onMouseEnter={() => {
          setHovered(true);
        }}
        onMouseLeave={() => {
          setHovered(false);
        }}
      >
        <span className="name-text">{name}</span>
        <Icon
          icon="delete"
          style={{ visibility: hovered ? "visible" : "hidden" }}
          onClick={() => {
            onDelete(id);
          }}
        />
      </Button>
      <Navbar.Divider />
    </>
  );
};

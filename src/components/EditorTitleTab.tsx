import React, { useState } from "react";
import { Button, Icon, Navbar } from "@blueprintjs/core";
import "./EditorTitleTab.css";

export interface EditorTitleTabProps {
  name: string;
  id: string;
  onDelete: (id: string) => void;
}

export const EditorTitleTab: React.FC<EditorTitleTabProps> = ({
  name,
  id,
  onDelete,
}) => {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <Button
        minimal
        className="editor-selector-button"
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

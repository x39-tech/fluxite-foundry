import { Button, Collapse, H4 } from "@blueprintjs/core";
import { useState } from "react";
import { Property } from "csstype";
import "./ItemEditor.css";
import { useAppSelector } from "app/hooks";

export interface BackgroundColor {
  light: Property.BackgroundColor;
  dark: Property.BackgroundColor;
}

export interface ItemEditorProps {
  title: string;
  expanded?: boolean;
  backgroundColor: BackgroundColor;
  onDelete: () => void;
  children: React.ReactNode;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({
  title,
  expanded = false,
  backgroundColor,
  onDelete,
  children,
}) => {
  const inDarkMode = useAppSelector((state) => state.appSettings.darkMode);

  const [isExpanded, setExpanded] = useState(expanded || false);

  return (
    <div
      className="item-editor"
      style={{
        backgroundColor: inDarkMode
          ? backgroundColor.dark
          : backgroundColor.light,
      }}
    >
      <div className="item-editor-title-section">
        <Button
          icon={isExpanded ? "minus" : "plus"}
          minimal={true}
          style={{ opacity: 0.8 }}
          onClick={() => setExpanded(!isExpanded)}
        />
        <H4>{title}</H4>
        <div style={{ flex: 1 }} />
        <Button icon="delete" minimal={true} onClick={onDelete} />
      </div>
      <Collapse isOpen={isExpanded}>{children}</Collapse>
    </div>
  );
};

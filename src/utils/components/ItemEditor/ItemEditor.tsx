import { Button, Collapse, Colors, H4 } from "@blueprintjs/core";
import { useState } from "react";
import "./ItemEditor.css";
import { useAppSelector } from "app/hooks";

const BACKGROUND_COLOR_DARK = Colors.DARK_GRAY2;
const BACKGROUND_COLOR_LIGHT = Colors.LIGHT_GRAY3;

export interface ItemEditorProps {
  title: string;
  expanded?: boolean;
  onDelete: () => void;
  children: React.ReactNode;
}

export const ItemEditor: React.FC<ItemEditorProps> = ({
  title,
  expanded = false,
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
          ? BACKGROUND_COLOR_DARK
          : BACKGROUND_COLOR_LIGHT,
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

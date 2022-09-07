import { useEffect } from "react";
import { BPSplit } from "utils/components/BPSplit/BPSplit";
import { ScalarItemsEditor } from "./scalarItemsEditor/ScalarItemsEditor";
import { StructuredItemsEditor } from "./structuredItemsEditor/StructuredItemsEditor";
import "./FixtureEditor.scss";

export interface FixtureEditorProps {
  title: string;
}

export const FixtureEditor: React.FC<FixtureEditorProps> = ({ title }) => {
  useEffect(() => {
    document.title = `Editing: ${title} -- UDR Builder`;
    return () => {
      document.title = "UDR Builder";
    };
  });

  return (
    <BPSplit className="fixture-editor" sizes={[50, 50]}>
      <ScalarItemsEditor />
      <StructuredItemsEditor />
    </BPSplit>
  );
};

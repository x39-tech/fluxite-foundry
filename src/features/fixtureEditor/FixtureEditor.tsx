import { BPSplit } from "utils/components/BPSplit/BPSplit";
import { ScalarItemsEditor } from "./scalarItemsEditor/ScalarItemsEditor";
import { StructuredItemsEditor } from "./structuredItemsEditor/StructuredItemsEditor";
import "./FixtureEditor.scss";

export const FixtureEditor = () => {
  return (
    <BPSplit className="fixture-editor" sizes={[50, 50]}>
      <ScalarItemsEditor />
      <StructuredItemsEditor />
    </BPSplit>
  );
};

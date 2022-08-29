import { useState } from "react";
import { BPSplit } from "utils/components/BPSplit/BPSplit";
import { ScalarItemsEditor } from "./scalarItemsEditor/ScalarItemsEditor";
import { StructuredItemsEditor } from "./structuredItemsEditor/StructuredItemsEditor";
import "./FixtureEditor.scss";
import { NewScalarItemDialog } from "./scalarItemsEditor/NewScalarItemDialog";

export const FixtureEditor = () => {
  const [newScalarItemDialogIsOpen, setNewScalarItemDialogIsOpen] =
    useState(false);

  return (
    <>
      <NewScalarItemDialog
        isOpen={newScalarItemDialogIsOpen}
        onAccepted={() => {
          setNewScalarItemDialogIsOpen(false);
        }}
        onCanceled={() => {
          setNewScalarItemDialogIsOpen(false);
        }}
      />
      <BPSplit className="fixture-editor" sizes={[50, 50]}>
        <ScalarItemsEditor
          onNewScalarItemClicked={() => {
            setNewScalarItemDialogIsOpen(true);
          }}
        />
        <StructuredItemsEditor />
      </BPSplit>
    </>
  );
};

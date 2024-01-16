import { useState } from "react";
import { useUdrDatabase } from "app/state";
import { AddItemSection } from "utils/components/AddItemSection/AddItemSection";
import { NewStructureDialog } from "./NewStructureDialog";
import { StructureValue, useStructures } from "./state";
import { RenderError } from "utils/components/RenderError";
import "./StructuresEditor.css";

const editorFactory: {
  [k: string]: (id: string, udr: StructureValue, key: number) => JSX.Element;
} = {};

export const StructuresEditor = () => {
  const database = useUdrDatabase();
  const structuresState = useStructures();
  if (!structuresState) {
    return <RenderError />;
  }

  const { structures, itemEditorLayout: structureEditors } = structuresState;

  const editors: Array<JSX.Element> = [];
  for (const [index, { udrId }] of structureEditors.entries()) {
    if (udrId in structures && structures[udrId].class in editorFactory) {
      editors.push(
        editorFactory[structures[udrId].class as keyof typeof editorFactory](
          udrId,
          structures[udrId].default!,
          index,
        ),
      );
    }
  }

  const [newStructureDialogIsOpen, setNewStructureDialogIsOpen] =
    useState(false);

  return (
    <div className="structures-editor-content">
      {editors}
      <AddItemSection onClick={() => setNewStructureDialogIsOpen(true)} />
      <NewStructureDialog
        isOpen={newStructureDialogIsOpen}
        onClose={() => setNewStructureDialogIsOpen(false)}
        database={database}
      />
    </div>
  );
};

import { useState } from "react";
import { useCurrentEditorSelector } from "app/hooks";
import { AddItemSection } from "utils/components/AddItemSection/AddItemSection";
import { NewStructureDialog } from "./NewStructureDialog";
import "./StructuresEditor.css";
import { StructureValue } from "./structuresEditorSlice";
import { UdrDatabase } from "udr/udrDatabase";

const editorFactory: {
  [k: string]: (id: string, udr: StructureValue, key: number) => JSX.Element;
} = {};

interface Props {
  database: UdrDatabase;
}

export const StructuresEditor = ({ database }: Props) => {
  const [structures, structureEditors] = useCurrentEditorSelector((state) => [
    state.structures.structures,
    state.structures.itemEditorLayout,
  ]);

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

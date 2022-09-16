import { useState } from "react";
import {
  DeviceIdentification,
  DEVICE_IDENTIFICATION_CLASS,
} from "udr/libraries/core/structuredItems/deviceIdentification";
import { AddItemSection } from "utils/components/AddItemSection/AddItemSection";
import { DeviceIdentificationEditor } from "./structuredItems/DeviceIdentificationEditor";
import { NewStructuredItemDialog } from "./NewStructuredItemDialog";
import { useCurrentEditorSelector } from "../fixtureEditorsState";
import "./StructuredItemsEditor.css";

const editorFactory = {
  [DEVICE_IDENTIFICATION_CLASS]: (
    id: string,
    udr: DeviceIdentification,
    key: number
  ) => {
    return <DeviceIdentificationEditor id={id} key={key} udr={udr} />;
  },
};

export const StructuredItemsEditor = () => {
  const [structuredItems, structuredItemEditors] = useCurrentEditorSelector(
    (state) => [
      state.structuredItems.structuredItems,
      state.structuredItems.itemEditorLayout,
    ]
  );

  const editors: Array<JSX.Element> = [];
  for (const [index, { udrId }] of structuredItemEditors.entries()) {
    if (
      udrId in structuredItems &&
      structuredItems[udrId].class in editorFactory
    ) {
      editors.push(
        editorFactory[
          structuredItems[udrId].class as keyof typeof editorFactory
        ](udrId, structuredItems[udrId].default!, index)
      );
    }
  }

  const [newStructuredItemDialogIsOpen, setNewStructuredItemDialogIsOpen] =
    useState(false);

  return (
    <div className="structured-items-editor-content">
      {editors}
      <AddItemSection onClick={() => setNewStructuredItemDialogIsOpen(true)} />
      <NewStructuredItemDialog
        isOpen={newStructuredItemDialogIsOpen}
        onClose={() => setNewStructuredItemDialogIsOpen(false)}
      />
    </div>
  );
};

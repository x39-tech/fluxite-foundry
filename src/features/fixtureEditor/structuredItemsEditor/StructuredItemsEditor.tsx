import { useState } from "react";
import {
  DeviceIdentification,
  DEVICE_IDENTIFICATION_CLASS,
} from "udr/libraries/core/structuredItems/deviceIdentification";
import { DeviceIdentificationEditor } from "./structuredItems/DeviceIdentificationEditor";
import "./StructuredItemsEditor.css";
import { useAppSelector } from "app/hooks";
import { AddItemSection } from "utils/components/AddItemSection/AddItemSection";
import { NewStructuredItemDialog } from "./NewStructuredItemDialog";

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
  const { udr, structuredItemEditors } = useAppSelector((state) => {
    const activeEditor =
      state.fixtureEditor.openEditors[state.fixtureEditor.selectedEditor];

    return {
      udr: activeEditor.udr.structuredItems,
      structuredItemEditors: activeEditor.structuredItemEditors,
    };
  });

  const editors: Array<JSX.Element> = [];
  for (const [index, { udrId }] of structuredItemEditors.entries()) {
    if (udr && udrId in udr && udr[udrId].class in editorFactory) {
      editors.push(
        editorFactory[udr[udrId].class as keyof typeof editorFactory](
          udrId,
          udr[udrId].default!,
          index
        )
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

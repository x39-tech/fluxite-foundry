import {
  AnchorButton,
  Button,
  Classes,
  H3,
  HTMLSelect,
} from "@blueprintjs/core";
import { useState } from "react";
import { useAppSelector } from "app/hooks";
import { Document } from "udr/objects/document";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";

export interface ExportUdrDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportUdrDialog: React.FC<ExportUdrDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const editors = useAppSelector((state) => state.editors.openEditors);
  const editorsArray = Object.entries(editors);
  const [selectedEditorId, setSelectedEditorId] = useState(
    editorsArray.length !== 0 ? editorsArray.at(0)![0] : undefined
  );

  // Make sure state is up-to-date
  if (editorsArray.length === 0) {
    if (selectedEditorId !== undefined) {
      setSelectedEditorId(undefined);
      return <></>;
    }
  } else if (
    editorsArray.filter(([id]) => id === selectedEditorId).length === 0
  ) {
    setSelectedEditorId(editorsArray.at(0)![0]);
  }

  let fileDownloadUrl = "";
  if (selectedEditorId) {
    const selectedEditor = editors[selectedEditorId];
    const deviceClassId = selectedEditor.deviceClassId;
    const document: Document = {
      e173: {
        deviceClasses: {
          [deviceClassId]: {
            scalarItems: selectedEditor.scalarItems.scalarItems,
            structuredItems: selectedEditor.structuredItems.structuredItems,
            ...selectedEditor.basicData,
          },
        },
      },
    };
    const blob = new Blob([JSON.stringify(document)]);
    fileDownloadUrl = URL.createObjectURL(blob);
  }

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>Export UDR Document</H3>
      </div>
      <div className={"export-udr-dialog-body " + Classes.DIALOG_BODY}>
        <p>Choose a device class to export:</p>
        <HTMLSelect
          onChange={(event) => setSelectedEditorId(event.currentTarget.value)}
        >
          {editorsArray.map(([id, editor]) => (
            <option key={id} value={id} selected={id === selectedEditorId}>
              {editor.deviceClassId}
            </option>
          ))}
        </HTMLSelect>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <AnchorButton
          intent="success"
          icon="tick"
          disabled={editorsArray.length === 0}
          download={`${editors[selectedEditorId!]?.deviceClassId}.json`}
          href={fileDownloadUrl}
          onClick={onClose}
        >
          Export
        </AnchorButton>
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </DarkModeAwareDialog>
  );
};

import {
  AnchorButton,
  Button,
  Checkbox,
  Classes,
  H3,
  HTMLSelect,
  HTMLTable,
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

  const [prettyPrint, setPrettyPrint] = useState(true);

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
            ...selectedEditor.basicData,
            scalarItems: { ...selectedEditor.scalarItems.scalarItems },
            structuredItems: {
              ...selectedEditor.structuredItems.structuredItems,
            },
          },
        },
      },
    };
    const blob = new Blob([
      prettyPrint
        ? JSON.stringify(document, null, 2)
        : JSON.stringify(document),
    ]);
    fileDownloadUrl = URL.createObjectURL(blob);
  }

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>Export UDR Document</H3>
      </div>
      <div className={"export-udr-dialog-body " + Classes.DIALOG_BODY}>
        <HTMLTable striped condensed>
          <tr>
            <td style={{ verticalAlign: "middle" }}>
              Choose a device class to export:
            </td>
            <td>
              <HTMLSelect
                value={selectedEditorId}
                onChange={(event) =>
                  setSelectedEditorId(event.currentTarget.value)
                }
              >
                {editorsArray.map(([id, editor]) => (
                  <option key={id} value={id}>
                    {editor.deviceClassId}
                  </option>
                ))}
              </HTMLSelect>
            </td>
          </tr>
          <tr>
            <td>
              <Checkbox
                label="Formatted"
                checked={prettyPrint}
                onChange={() => setPrettyPrint(!prettyPrint)}
              />
            </td>
          </tr>
        </HTMLTable>
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

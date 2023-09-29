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
import { E173UDRDocuments as UDRDocument } from "generated/draft-2023-1/udr-document";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog/DarkModeAwareDialog";
import { DeviceClassEditorState } from "features/deviceClassEditor/deviceClassEditorState";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportUdrDialog = ({ isOpen, onClose }: Props) => {
  const editors = useAppSelector((state) => state.editors.openEditors);
  const editorsArray = Object.entries(editors);
  const [selectedEditorId, setSelectedEditorId] = useState(
    editorsArray.length !== 0 ? editorsArray.at(0)![0] : undefined,
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

  const fileDownloadUrl = getFileDownloadUrl(
    selectedEditorId,
    editors,
    prettyPrint,
  );

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

function getFileDownloadUrl(
  selectedEditorId: string | undefined,
  editors: { [id: string]: DeviceClassEditorState },
  prettyPrint: boolean,
) {
  if (selectedEditorId) {
    const selectedEditor = editors[selectedEditorId];
    if (selectedEditor) {
      const deviceClassId = selectedEditor.deviceClassId;
      const document: UDRDocument = {
        e173doc: {
          deviceClasses: {
            [deviceClassId]: {
              libraries: {},
              ...selectedEditor.basicData,
              parameters: selectedEditor.parameters.parameters,
              structures: selectedEditor.structures.structures,
            },
          },
        },
        $schema:
          "https://gitlab.com/esta-cpwg/e173/-/raw/main/schemas/draft-2023-1/udr-document.json",
      };
      const blob = new Blob([
        prettyPrint
          ? JSON.stringify(document, null, 2)
          : JSON.stringify(document),
      ]);
      return URL.createObjectURL(blob);
    }
  }
  return "";
}

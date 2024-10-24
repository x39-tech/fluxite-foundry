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
import { E173Document } from "e173";
import { DarkModeAwareDialog } from "utils/components/DarkModeAwareDialog";
import {
  useDeviceClassEditors,
  useOpenDeviceClassEditorsWithNames,
} from "./state";
import { DeviceClassEditorState } from "app/state";
import { TextEditorField } from "utils/components/EditorFields/TextEditorField";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportUdrDialog = ({ isOpen, onClose }: Props) => {
  // TODO: generic over editor type
  const editors = useOpenDeviceClassEditorsWithNames();
  const deviceClassEditors = useDeviceClassEditors();

  const [selectedEditorId, setSelectedEditorId] = useState(
    editors.length !== 0 ? editors[0].id : undefined,
  );
  const selectedEditor = editors.find(
    (editor) => editor.id == selectedEditorId,
  );
  const [deviceClassId, setDeviceClassId] = useState(
    deviceClassEditors[selectedEditor?.id ?? ""]?.deviceClassId ?? "",
  );

  const [prettyPrint, setPrettyPrint] = useState(true);

  const fileDownloadUrl = getFileDownloadUrl(
    selectedEditorId,
    deviceClassEditors,
    deviceClassId,
    prettyPrint,
  );

  return (
    <DarkModeAwareDialog isOpen={isOpen} onClose={onClose}>
      <div className={Classes.DIALOG_HEADER}>
        <H3>Export UDR Document</H3>
      </div>
      <div className={"export-udr-dialog-body " + Classes.DIALOG_BODY}>
        <HTMLTable compact>
          <tbody>
            <tr>
              <td style={{ verticalAlign: "middle" }}>
                Choose a device class to export:
              </td>
              <td>
                <HTMLSelect
                  value={selectedEditorId}
                  onChange={(event) => {
                    setSelectedEditorId(event.currentTarget.value);
                    setDeviceClassId(
                      deviceClassEditors[event.currentTarget.value]
                        ?.deviceClassId ?? "",
                    );
                  }}
                >
                  {editors.map(({ id, name }, index) => (
                    <option key={id} value={id}>
                      {`${index + 1}: ${name}`}
                    </option>
                  ))}
                </HTMLSelect>
              </td>
            </tr>
            <tr>
              <td style={{ verticalAlign: "middle " }}>
                Select a device class ID:
              </td>
              <td>
                <TextEditorField
                  value={deviceClassId}
                  onValueChanged={(newValue) => setDeviceClassId(newValue)}
                />
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
          </tbody>
        </HTMLTable>
      </div>
      <div className={Classes.DIALOG_FOOTER}>
        <AnchorButton
          intent="success"
          icon="tick"
          disabled={editors.length === 0}
          download={`${deviceClassId || "my-device"}.json`}
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
  deviceClassId: string,
  prettyPrint: boolean,
) {
  if (selectedEditorId) {
    const selectedEditor = editors[selectedEditorId];
    if (selectedEditor) {
      const document: E173Document = {
        e173doc: {
          deviceClasses: {
            [deviceClassId || "my-device"]: {
              // TODO version
              "1.0.0": {
                libraries: selectedEditor.libraries,
                ...selectedEditor.basicData,
                parameters: selectedEditor.parameters.parameters,
                structures: selectedEditor.structures.structures,
              },
            },
          },
        },
        $schema:
          "https://gitlab.com/esta-cpwg/e173/-/raw/main/schemas/draft-2024-1/full/udr-document.json",
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

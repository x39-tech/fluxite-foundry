import { AnchorButton, Button } from "@blueprintjs/core";
import { useState } from "react";
import { E173Document } from "e173";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import {
  useDeviceClassEditors,
  useOpenDeviceClassEditorsWithNames,
} from "./state";
import { DeviceClassEditorState } from "app/state";
import { TextEditorField } from "components/EditorFields/TextEditorField";
import { SimplePropsTable } from "components/SimplePropsTable";
import { Select } from "components/Select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export UDR Document</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col">
          <SimplePropsTable>
            <tr>
              <td>Choose a device class to export:</td>
              <td>
                <Select
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
                </Select>
              </td>
            </tr>
            <tr>
              <td>Select a device class ID:</td>
              <td>
                <TextEditorField
                  value={deviceClassId}
                  onValueChanged={(newValue) => setDeviceClassId(newValue)}
                />
              </td>
            </tr>
            <tr>
              <td colSpan={2}>
                <LabeledCheckbox
                  label="Formatted"
                  checked={prettyPrint}
                  onChange={() => setPrettyPrint(!prettyPrint)}
                />
              </td>
            </tr>
          </SimplePropsTable>
        </div>
        <DialogFooter>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
                deviceLibrary: selectedEditor.deviceLibrary
                  ? selectedEditor.deviceLibrary
                  : undefined,
                ...selectedEditor.basicData,
                parameters: selectedEditor.parameters.parameters,
                structures: selectedEditor.structures.structures,
                localizations: selectedEditor.localizations
                  ? selectedEditor.localizations
                  : undefined,
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

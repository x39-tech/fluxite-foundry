import { useEffect, useId, useRef, useState } from "react";
import { E173Archive, E173Document } from "e173";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { Button } from "components/scn-ui/Button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { Label } from "components/scn-ui/Label";
import { FieldSet } from "components/FieldSet";
import { SelectField } from "components/EditorFields/SelectField";
import { AppInput } from "components/AppInput";
import { useDeviceClassEditors, useOpenEditors } from "./state";
import { DeviceClassEditorState, EditorType, OpenEditor } from "app/state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import JSZip from "jszip";
import { assetStorage } from "app/assetStorage";

interface OpenEditorWithName extends OpenEditor {
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportUdrDialog = ({ isOpen, onClose }: Props) => {
  // TODO: generic over editor type
  const openEditors = useOpenEditors();
  const deviceClassEditors = useDeviceClassEditors();

  const editorsWithNames = openEditors.editors.reduce(
    (accum: OpenEditorWithName[], value) => {
      if (value.type == EditorType.DEVICE_CLASS) {
        const editorState = deviceClassEditors[value.id];
        if (editorState) {
          accum.push({
            ...value,
            name: editorState.basicData.info.model.name,
          });
        }
      }
      return accum;
    },
    [],
  );

  const [selectedEditorId, setSelectedEditorId] = useState(
    editorsWithNames.length !== 0 ? editorsWithNames[0].id : undefined,
  );
  const selectedEditor = editorsWithNames.find(
    (editor) => editor.id === selectedEditorId,
  );
  const [deviceClassId, setDeviceClassId] = useState(
    deviceClassEditors[selectedEditor?.id ?? ""]?.deviceClassId ?? "",
  );
  const [prettyPrint, setPrettyPrint] = useState(true);
  const [createArchive, setCreateArchive] = useState(true);

  const devClassSelId = useId();
  const devClassIdId = useId();

  const [fileDownloadUrl, setFileDownloadUrl] = useState<string | undefined>(
    undefined,
  );
  const downloadRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (fileDownloadUrl && downloadRef.current) {
      downloadRef.current.click();
      setFileDownloadUrl(undefined);
      onClose();
    }
  }, [fileDownloadUrl]);

  const downloadFileName = `${deviceClassId || "my-device"}.${createArchive ? "fca" : "fcd"}`;

  const createAndDownload = async () => {
    const editor = deviceClassEditors[selectedEditorId!];
    if (!editor) {
      toast(
        "Error constructing Fluxite Codex Document. Please make sure the selected device class is valid.",
      );
      return;
    }

    const fullId = `org.esta.e173.user.${crypto.randomUUID()}.dev.${deviceClassId || "my-device"}`;

    const doc = createDocument(editor, fullId);

    let blob;

    if (createArchive) {
      blob = await createFluxiteCodexArchive(
        doc,
        editor,
        fullId,
        "1.0.0",
        prettyPrint,
      );
    } else {
      blob = new Blob([
        prettyPrint ? JSON.stringify(doc, null, 2) : JSON.stringify(doc),
      ]);
    }

    if (!blob) {
      return;
    }

    const url = URL.createObjectURL(blob);
    setFileDownloadUrl(url);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export UDR</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <FieldSet>
            <Label htmlFor={devClassSelId}>Device Class to export</Label>
            <SelectField
              id={devClassSelId}
              values={editorsWithNames.map(({ id }) => id)}
              displayValues={editorsWithNames.map(({ name }) => name)}
              selectedValue={selectedEditorId}
              onSelectionChanged={(value) => {
                setSelectedEditorId(value);
                setDeviceClassId(
                  deviceClassEditors[value]?.deviceClassId ?? "",
                );
              }}
            />
          </FieldSet>
          <FieldSet>
            <Label htmlFor={devClassIdId}>Device Class ID</Label>
            <AppInput
              value={deviceClassId}
              onChange={(e) => setDeviceClassId(e.target.value)}
            />
          </FieldSet>
          <LabeledCheckbox checked={prettyPrint} onChange={setPrettyPrint}>
            Formatted
          </LabeledCheckbox>
          <div className="flex gap-2">
            <LabeledCheckbox
              checked={createArchive}
              onChange={setCreateArchive}
            >
              Include Assets
            </LabeledCheckbox>
            <Tooltip>
              <TooltipTrigger asChild>
                <QuestionMarkCircleIcon className="size-5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                If selected, a Fluxite Codex Archive will be created including
                any resource assets added to this device class. Otherwise, a
                Fluxite Codex Document will be created without including assets.
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={editorsWithNames.length === 0}
            onClick={createAndDownload}
          >
            Export
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <a
            hidden
            href={fileDownloadUrl}
            ref={downloadRef}
            download={downloadFileName}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function createDocument(
  editor: DeviceClassEditorState,
  deviceClassId: string,
): E173Document {
  return {
    e173doc: {
      deviceClasses: {
        [deviceClassId]: {
          // TODO version
          "1.0.0": {
            libraries: editor.libraries,
            deviceLibrary: editor.deviceLibrary
              ? editor.deviceLibrary
              : undefined,
            ...editor.basicData,
            parameters: editor.parameters.parameters,
            structures: editor.structures.structures,
            resources: editor.resources.resources,
            localizations: editor.localizations
              ? editor.localizations
              : undefined,
          },
        },
      },
    },
    $schema:
      "https://gitlab.com/esta-cpwg/e173/-/raw/main/schemas/draft-2024-1/full/udr-document.json",
  };
}

async function createFluxiteCodexArchive(
  doc: E173Document,
  editor: DeviceClassEditorState,
  deviceClassId: string,
  deviceClassVersion: string,
  prettyPrint: boolean,
): Promise<Blob | null> {
  const assetsDirName = `${deviceClassId}-assets`;

  const archive: E173Archive = {
    e173archive: {
      deviceClasses: {
        [deviceClassId]: {
          [deviceClassVersion]: {
            assetsDirectory: assetsDirName,
          },
        },
      },
    },
    info: "A Fluxite Codex Archive generated by Fluxite Foundry",
    $schema:
      "https://gitlab.com/esta-cpwg/e173/-/raw/main/schemas/draft-2024-1/udr-archive.json",
  };

  const zip = new JSZip();
  zip.file(
    "e173archive.json",
    prettyPrint ? JSON.stringify(archive, null, 2) : JSON.stringify(archive),
  );
  zip.file(
    `${deviceClassId}.json`,
    prettyPrint ? JSON.stringify(doc, null, 2) : JSON.stringify(doc),
  );

  const assetsDir = zip.folder(assetsDirName);
  if (!assetsDir) {
    toast("Error creating ZIP file: couldn't add directory.");
    return null;
  }

  for (const [id, resource] of Object.entries(editor.resources.resources)) {
    if (resource.default && editor.resources.resourceAssets[resource.default]) {
      const asset = await assetStorage.getAsset(
        editor.resources.resourceAssets[resource.default],
      );
      if (!asset) {
        toast(`Error creating archive: couldn't load resource asset for ${id}`);
        return null;
      }
      assetsDir.file(resource.default, asset.data);
    }
  }

  return await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

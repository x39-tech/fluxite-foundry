import { useEffect, useId, useRef, useState } from "react";
import {
  E173Archive,
  E173Document,
  RawE173Document,
  unparseFluxiteCodexDocument,
} from "@cpwg-community/delver";
import { QuestionMarkCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import JSZip from "jszip";
import { LabeledCheckbox } from "components/LabeledCheckbox";
import { Button } from "components/scn-ui/Button";
import {
  Dialog,
  DialogDescription,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "components/scn-ui/Dialog";
import { Label } from "components/scn-ui/Label";
import { FieldSet } from "components/FieldSet";
import { SelectField } from "components/EditorFields/SelectField";
import { useDeviceClassEditors, useOpenEditors } from "./state";
import {
  DeviceClassEditorState,
  editorTypes,
  EntityId,
  OpenEditor,
} from "app/persistentState";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { assetStorage } from "app/assetStorage";
import { buildQualifiedId, EntityType } from "utils/utils";
import { exportDeviceClass } from "features/deviceClassEditor/export";
import { CODEX_ARCHIVE_SCHEMA_URL, CODEX_DOC_SCHEMA_URL } from "consts";

interface OpenEditorWithName extends OpenEditor {
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportFluxiteCodexDialog = ({ isOpen, onClose }: Props) => {
  // TODO: generic over editor type
  const openEditors = useOpenEditors();
  const deviceClassEditors = useDeviceClassEditors();

  const editorsWithNames = openEditors.editors.reduce(
    (accum: OpenEditorWithName[], value) => {
      if (value.type == editorTypes.DEVICE_CLASS) {
        const editorState = deviceClassEditors[value.id];
        if (editorState) {
          accum.push({
            ...value,
            name: editorState.basicData.modelName,
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
  const [prettyPrint, setPrettyPrint] = useState(true);
  const [createArchive, setCreateArchive] = useState(true);

  const devClassSelId = useId();

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

  const editor = selectedEditorId
    ? deviceClassEditors[selectedEditorId]
    : undefined;
  const downloadFileName = `${editor?.deviceClassId || "my-device"}.${createArchive ? "fca" : "fcd"}`;

  const createAndDownload = async () => {
    const editor = deviceClassEditors[selectedEditorId!];
    if (!editor) {
      toast(
        "Error constructing Fluxite Codex Document. Please make sure the selected device class is valid.",
      );
      return;
    }

    const doc = createDocument(editor);

    let blob;

    const rawDoc = unparseFluxiteCodexDocument(doc);

    if (createArchive) {
      blob = await createFluxiteCodexArchive(rawDoc, editor, prettyPrint);
    } else {
      blob = new Blob([
        prettyPrint ? JSON.stringify(rawDoc, null, 2) : JSON.stringify(rawDoc),
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
          <DialogTitle>Export Fluxite Codex</DialogTitle>
          <DialogDescription>
            Export a device class to a Fluxite Codex archive or document file
          </DialogDescription>
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
                setSelectedEditorId(EntityId(value));
              }}
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

function createDocument(editor: DeviceClassEditorState): E173Document {
  const id = buildQualifiedId(
    EntityType.Dev,
    editor.orgId,
    editor.deviceClassId,
  );

  return {
    e173doc: {
      deviceClasses: {
        [id]: {
          [editor.deviceClassVersion]: exportDeviceClass(editor),
        },
      },
    },
    $schema: CODEX_DOC_SCHEMA_URL,
  };
}

async function createFluxiteCodexArchive(
  doc: RawE173Document,
  editor: DeviceClassEditorState,
  prettyPrint: boolean,
): Promise<Blob | null> {
  const deviceClassId = buildQualifiedId(
    EntityType.Dev,
    editor.orgId,
    editor.deviceClassId,
  );
  const assetsDirName = `${deviceClassId}-assets`;

  const archive: E173Archive = {
    e173archive: {
      deviceClasses: {
        [deviceClassId]: {
          [editor.deviceClassVersion]: {
            assetsDirectory: assetsDirName,
          },
        },
      },
    },
    info: "A Fluxite Codex Archive generated by Fluxite Foundry",
    $schema: CODEX_ARCHIVE_SCHEMA_URL,
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

  for (const [id, resource] of Object.entries(editor.resources)) {
    if (resource.default && editor.resourceAssets[resource.default]) {
      const asset = await assetStorage.getAsset(
        editor.resourceAssets[resource.default],
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

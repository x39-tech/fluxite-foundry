import { useId, useState } from "react";
import {
  E173Archive,
  E173Document,
  RawE173Document,
  unparseFluxiteCodexDocument,
} from "@cpwg-community/delver";
import { CircleQuestionMarkIcon } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
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
import { useDeviceClassDocuments, useOpenDocumentIds } from "./state";
import { DeviceClassDocument, EntityId } from "app/persistentState";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { assetStorage } from "app/assetStorage";
import { saveFile } from "app/saveFile";
import { buildQualifiedId, EntityType, errorMessage } from "utils/utils";
import { exportDeviceClass } from "features/deviceClassEditor/export";
import {
  APP_NAME,
  CODEX_ARCHIVE_SCHEMA_URL,
  CODEX_DOC_SCHEMA_URL,
} from "consts";

const MESSAGES = {
  invalidDeviceClass: msg({
    id: "navbar.exportCodex.invalidDeviceClass",
    message:
      "Error constructing Fluxite Codex Document. Please make sure the selected device class is valid.",
  }),
  archiveFileType: msg({
    id: "navbar.exportCodex.archiveFileType",
    message: "Fluxite Codex Archive",
  }),
  documentFileType: msg({
    id: "navbar.exportCodex.documentFileType",
    message: "Fluxite Codex Document",
  }),
  saveFailed: msg({
    id: "navbar.exportCodex.saveFailed",
    message: "Error saving {fileName}: {reason}",
  }),
  zipDirectoryFailed: msg({
    id: "navbar.exportCodex.zipDirectoryFailed",
    message: "Error creating ZIP file: couldn't add directory.",
  }),
  assetMissing: msg({
    id: "navbar.exportCodex.assetMissing",
    message: "Error creating archive: couldn't load resource asset for {id}",
  }),
};

interface OpenEditorWithName {
  id: EntityId;
  name: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportFluxiteCodexDialog = ({ isOpen, onClose }: Props) => {
  // TODO: generic over document type
  const openDocumentIds = useOpenDocumentIds();
  const deviceClassEditors = useDeviceClassDocuments();

  // Only device classes can be exported so far, so the list is the open
  // documents that are device classes, in tab order.
  const editorsWithNames = openDocumentIds.reduce(
    (accum: OpenEditorWithName[], id) => {
      const editorState = deviceClassEditors[id];
      if (editorState) {
        accum.push({ id, name: editorState.basicData.modelName });
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
  const { _ } = useLingui();

  const editor = selectedEditorId
    ? deviceClassEditors[selectedEditorId]
    : undefined;
  const exportFileName = `${editor?.deviceClassId || "my-device"}.${createArchive ? "fca" : "fcd"}`;

  const createAndExport = async () => {
    const editor = deviceClassEditors[selectedEditorId!];
    if (!editor) {
      toast(_(MESSAGES.invalidDeviceClass));
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

    try {
      await saveFile(
        blob,
        exportFileName,
        _(createArchive ? MESSAGES.archiveFileType : MESSAGES.documentFileType),
      );
    } catch (error) {
      toast.error(
        _({
          ...MESSAGES.saveFailed,
          values: { fileName: exportFileName, reason: errorMessage(error) },
        }),
      );
      return;
    }

    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            <Trans id="navbar.exportCodex.title">Export Fluxite Codex</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans id="navbar.exportCodex.description">
              Export a device class to a Fluxite Codex archive or document file
            </Trans>
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <FieldSet>
            <Label htmlFor={devClassSelId}>
              <Trans id="navbar.exportCodex.deviceClassLabel">
                Device Class to export
              </Trans>
            </Label>
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
            <Trans id="navbar.exportCodex.formatted">Formatted</Trans>
          </LabeledCheckbox>
          <div className="flex gap-2">
            <LabeledCheckbox
              checked={createArchive}
              onChange={setCreateArchive}
            >
              <Trans id="navbar.exportCodex.includeAssets">
                Include Assets
              </Trans>
            </LabeledCheckbox>
            <Tooltip>
              <TooltipTrigger asChild>
                <CircleQuestionMarkIcon className="size-5" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <Trans id="navbar.exportCodex.includeAssetsHelp">
                  If selected, a Fluxite Codex Archive will be created including
                  any resource assets added to this device class. Otherwise, a
                  Fluxite Codex Document will be created without including
                  assets.
                </Trans>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <DialogFooter>
          <Button
            disabled={editorsWithNames.length === 0}
            onClick={createAndExport}
          >
            <Trans id="navbar.exportCodex.export">Export</Trans>
          </Button>
          <Button variant="secondary" onClick={onClose}>
            <Trans id="navbar.exportCodex.cancel">Cancel</Trans>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

function createDocument(editor: DeviceClassDocument): E173Document {
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
  editor: DeviceClassDocument,
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
    // eslint-disable-next-line lingui/no-unlocalized-strings
    info: `A Fluxite Codex Archive generated by ${APP_NAME}`,
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
    toast(i18n._(MESSAGES.zipDirectoryFailed));
    return null;
  }

  for (const [id, resource] of Object.entries(editor.resources)) {
    if (resource.default && editor.resourceAssets[resource.default]) {
      const asset = await assetStorage.getAsset(
        editor.resourceAssets[resource.default],
      );
      if (!asset) {
        toast(i18n._({ ...MESSAGES.assetMissing, values: { id } }));
        return null;
      }
      assetsDir.file(resource.default, asset.data);
    }
  }

  return await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
}

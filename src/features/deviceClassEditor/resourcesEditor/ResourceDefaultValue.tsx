import { Trans } from "@lingui/react/macro";
import { msg } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  CircleAlertIcon,
  ClipboardIcon,
  LoaderCircle,
  SquareCodeIcon,
} from "lucide-react";
import { Asset, assetStorage } from "app/assetStorage";
import { AppInput } from "components/AppInput";
import { formatFileSize } from "utils/utils";
import { Dialog, DialogContent, DialogTrigger } from "components/scn-ui/Dialog";
import { Button } from "components/scn-ui/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { SmallIconButton } from "components/SmallIconButton";
import { Alert } from "components/scn-ui/Alert";

const MESSAGES = {
  size: msg({ id: "deviceClassEditor.resourceDefault.size", message: "Size" }),
  originalFileName: msg({
    id: "deviceClassEditor.resourceDefault.originalFileName",
    message: "Original File Name",
  }),
  sha1: msg({ id: "deviceClassEditor.resourceDefault.sha1", message: "SHA-1" }),
  sha256: msg({
    id: "deviceClassEditor.resourceDefault.sha256",
    message: "SHA-256",
  }),
  readFailed: msg({
    id: "deviceClassEditor.resourceDefault.readFailed",
    message: "Error reading selected file",
  }),
  wrongType: msg({
    id: "deviceClassEditor.resourceDefault.wrongType",
    message: "Selected file is of invalid type {actual} (expected {expected})",
  }),
  // Describes the image to a screen reader when the file has no name of its own.
  altText: msg({
    id: "deviceClassEditor.resourceDefault.altText",
    message: "Default resource value of type {mediaType}",
  }),
  unknownMediaType: msg({
    id: "deviceClassEditor.resourceDefault.unknownMediaType",
    message: "unknown",
  }),
};

export type AssetId =
  | { state: "none" }
  | { state: "valid"; id: string }
  | { state: "missing" };

interface Props {
  id: string;
  mediaType?: string;
  assetId: AssetId;
  onChange: (newAssetId: string) => void;
  onDelete: () => void;
}

export const ResourceDefaultValue = ({
  id,
  mediaType,
  assetId,
  onChange,
  onDelete,
}: Props) => {
  const { _ } = useLingui();

  const [isLoading, setIsLoading] = useState(
    assetId.state === "valid" ? true : false,
  );
  const [asset, setAsset] = useState<Asset | null>(null);

  useEffect(() => {
    const loadAsset = async (assetId: string) => {
      setIsLoading(true);
      const asset = await assetStorage.getAsset(assetId);
      setIsLoading(false);
      if (asset) {
        setAsset(asset);
      }
    };

    if (assetId.state === "valid") {
      loadAsset(assetId.id);
    } else {
      setAsset(null);
    }
  }, [assetId]);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.currentTarget.files?.item(0) ?? null;
    if (!file) {
      toast(_(MESSAGES.readFailed));
      return;
    }

    if (!acceptsMediaType(file.type, mediaType)) {
      toast(
        _({
          ...MESSAGES.wrongType,
          values: { actual: file.type, expected: mediaType },
        }),
      );
      return;
    }

    setIsLoading(true);
    const arrayBuffer = await file.arrayBuffer();
    const assetId = await assetStorage.storeAsset(
      arrayBuffer,
      mediaType,
      file.name,
    );
    onChange(assetId);
  };

  if (asset) {
    return (
      <DefaultValWidget
        id={id}
        asset={asset}
        onChange={handleFileChange}
        onDelete={onDelete}
      />
    );
  } else if (isLoading) {
    return (
      <div className="flex gap-2 items-center">
        <LoaderCircle className="h-6 w-6 animate-spin" />
        <div id={id} className="text-lg">
          <Trans id="deviceClassEditor.resourceDefault.loading">
            Loading...
          </Trans>
        </div>
      </div>
    );
  } else if (assetId.state != "none") {
    return (
      <AssetError
        mediaType={mediaType}
        onChange={handleFileChange}
        onDelete={onDelete}
      />
    );
  } else {
    return (
      <AppInput
        id={id}
        type="file"
        accept={getAcceptedMediaType(mediaType)}
        onChange={handleFileChange}
      />
    );
  }
};

interface WidgetProps {
  id: string;
  asset: Asset;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void;
}

const DefaultValWidget = ({ id, asset, onChange, onDelete }: WidgetProps) => {
  const { _ } = useLingui();

  const changeRef = useRef<HTMLInputElement>(null);

  const handleChangeBtn = () => {
    if (changeRef.current) {
      changeRef.current.click();
    }
  };

  let interior = null;
  switch (asset.mediaType) {
    case "image/png":
    case "image/jpeg":
      interior = <ImageWidget id={id} asset={asset} />;
      break;
    default:
      interior = <OpaqueDataWidget id={id} asset={asset} />;
      break;
  }

  return (
    <div className="flex flex-col gap-2 p-2 border rounded-sm">
      {interior}
      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline">
              <Trans id="deviceClassEditor.resourceDefault.details">
                Details
              </Trans>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col">
              <WidgetInfoRow label={_(MESSAGES.size)}>
                {formatFileSize(asset.data.byteLength)}
              </WidgetInfoRow>
              {asset.originalFileName && (
                <WidgetInfoRow label={_(MESSAGES.originalFileName)}>
                  {asset.originalFileName}
                </WidgetInfoRow>
              )}
              <WidgetInfoRow label={_(MESSAGES.sha1)} withCopyIcon>
                {asset.sha1}
              </WidgetInfoRow>
              <WidgetInfoRow label={_(MESSAGES.sha256)} withCopyIcon>
                {asset.sha256}
              </WidgetInfoRow>
            </div>
          </TooltipContent>
        </Tooltip>
        <Button onClick={handleChangeBtn}>
          <Trans id="deviceClassEditor.resourceDefault.change">Change</Trans>
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          <Trans id="deviceClassEditor.resourceDefault.remove">Remove</Trans>
        </Button>
        <AppInput
          ref={changeRef}
          hidden
          type="file"
          accept={getAcceptedMediaType(asset.mediaType)}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

interface AssetErrorProps {
  mediaType?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDelete: () => void;
}

const AssetError = ({ mediaType, onChange, onDelete }: AssetErrorProps) => {
  const changeRef = useRef<HTMLInputElement>(null);

  const handleChangeBtn = () => {
    if (changeRef.current) {
      changeRef.current.click();
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 border rounded-sm">
      <Alert>
        <CircleAlertIcon className="size-8" />
        <Trans id="deviceClassEditor.resourceDefault.loadFailed">
          Error loading asset.
        </Trans>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={handleChangeBtn}>
          <Trans id="deviceClassEditor.resourceDefault.change">Change</Trans>
        </Button>
        <Button variant="destructive" onClick={onDelete}>
          <Trans id="deviceClassEditor.resourceDefault.remove">Remove</Trans>
        </Button>
        <AppInput
          ref={changeRef}
          hidden
          type="file"
          accept={getAcceptedMediaType(mediaType)}
          onChange={onChange}
        />
      </div>
    </div>
  );
};

interface WidgetInfoRowProps {
  label: string;
  withCopyIcon?: boolean;
  children: string;
}

const WidgetInfoRow = ({
  label,
  children,
  withCopyIcon,
}: WidgetInfoRowProps) => {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex items-center gap-1">
      <strong className="font-bold">{label}:</strong> {children}
      {withCopyIcon &&
        (copied ? (
          <CheckIcon className="size-5" />
        ) : (
          <SmallIconButton
            className="size-5"
            onClick={() => {
              navigator.clipboard.writeText(children);
              setCopied(true);
            }}
          >
            <ClipboardIcon />
          </SmallIconButton>
        ))}
    </div>
  );
};

interface WidgetInteriorProps {
  id: string;
  asset: Asset;
}

const ImageWidget = ({ id, asset }: WidgetInteriorProps) => {
  const { _ } = useLingui();

  const blob = new Blob([asset.data], { type: asset.mediaType });
  const url = URL.createObjectURL(blob);
  const altText =
    asset.originalFileName ||
    _({
      ...MESSAGES.altText,
      values: {
        mediaType: asset.mediaType || _(MESSAGES.unknownMediaType),
      },
    });

  return (
    <Dialog>
      <DialogTrigger asChild>
        <img
          id={id}
          className="max-w-xs max-h-80 object-contain border rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
          src={url}
          alt={altText}
        />
      </DialogTrigger>
      <DialogContent
        className="!w-fit !h-fit !max-w-[90vw] !max-h-[90vh] p-0 border-0"
        showCloseButton={false}
      >
        <img
          className="max-w-[90vw] max-h-[90vh] object-contain"
          src={url}
          alt={altText}
        />
      </DialogContent>
    </Dialog>
  );
};

const OpaqueDataWidget = ({ id }: WidgetInteriorProps) => {
  return (
    <div className="flex items-center gap-2">
      <SquareCodeIcon className="size-10" />
      <div id={id}>
        <Trans id="deviceClassEditor.resourceDefault.opaqueData">
          Opaque data
        </Trans>
      </div>
    </div>
  );
};

function getAcceptedMediaType(mediaType?: string): string | undefined {
  if (!mediaType || mediaType === "application/octet-stream") {
    return undefined;
  } else {
    return mediaType;
  }
}

function acceptsMediaType(
  receivedType: string,
  expectedType?: string,
): boolean {
  if (
    !expectedType ||
    expectedType === receivedType ||
    expectedType === "application/octet-stream"
  ) {
    return true;
  }

  return false;
}

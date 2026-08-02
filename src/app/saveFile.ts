import { isTauri } from "@tauri-apps/api/core";

export type SaveFileResult =
  /** `path` is only ever set on the desktop. */
  { status: "saved"; path?: string } | { status: "cancelled" };

/**
 * Write a generated file out to wherever the user wants it.
 *
 * Browser and Tauri have to do this in completely different ways. A browser can
 * only hand the blob to its download manager and never reports back what the
 * user did with it. The desktop app has no download manager at all, so it asks
 * for a path and writes the bytes itself.
 *
 * Because the browser cannot report a cancelled download, "saved" there means
 * only that the file was handed off, not that it reached disk.
 *
 * @param fileTypeName Human-readable name for the file type, shown next to the
 * extension in the desktop save dialog. Ignored in the browser.
 */
export const saveFile = async (
  blob: Blob,
  suggestedFileName: string,
  fileTypeName?: string,
): Promise<SaveFileResult> => {
  if (isTauri()) {
    return saveViaNativeDialog(blob, suggestedFileName, fileTypeName);
  }
  return saveViaBrowserDownload(blob, suggestedFileName);
};

const saveViaNativeDialog = async (
  blob: Blob,
  suggestedFileName: string,
  fileTypeName?: string,
): Promise<SaveFileResult> => {
  // Loaded lazily so the browser build never pulls the Tauri plugins into its
  // bundle.
  const [{ save }, { writeFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);

  const extension = extensionOf(suggestedFileName);

  const path = await save({
    defaultPath: suggestedFileName,
    filters: extension
      ? [
          {
            name: fileTypeName ?? extension.toUpperCase(),
            extensions: [extension],
          },
        ]
      : undefined,
  });

  if (path === null) {
    return { status: "cancelled" };
  }

  // Tauri adds the path chosen in the save dialog to the filesystem scope, so
  // this write is permitted even though the app has no standing access to it.
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
  return { status: "saved", path };
};

const saveViaBrowserDownload = (
  blob: Blob,
  suggestedFileName: string,
): SaveFileResult => {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = suggestedFileName;
    anchor.click();
  } finally {
    URL.revokeObjectURL(url);
  }
  return { status: "saved" };
};

/**
 * Write a file straight to a specified path, without asking the user anything.
 *
 * Typically used on desktop when a path for a given file has already been
 * chosen for a user (e.g. File -> Save as opposed to Save As).
 *
 * @throws in the browser, which has no paths to write to.
 */
export const writeFileToPath = async (
  blob: Blob,
  path: string,
): Promise<void> => {
  if (!isTauri()) {
    throw new Error("Only the desktop app can write to a path.");
  }

  const { writeFile } = await import("@tauri-apps/plugin-fs");
  await writeFile(path, new Uint8Array(await blob.arrayBuffer()));
};

const extensionOf = (fileName: string): string | undefined => {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot <= 0 || lastDot === fileName.length - 1) {
    return undefined;
  }
  return fileName.slice(lastDot + 1);
};

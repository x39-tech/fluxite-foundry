import { isTauri } from "@tauri-apps/api/core";

export interface OpenedFile {
  /** The contents of the file. */
  data: Blob;
  /** The name of the file, including its extension. */
  name: string;
  /**
   * Where the file was read from, when the platform says. Only the desktop app
   * knows; a file picked in a browser arrives without a path.
   */
  path?: string;
}

export type OpenFileResult = OpenedFile | "cancelled";

/**
 * Ask the user for a file to read.
 *
 * Browser and Tauri have different ways to do this, so this detects which one
 * we are in and uses the appropriate path.
 *
 * Must be called from a user gesture, because the browser's file picker will
 * not open without one.
 *
 * @param extensions the file extensions to offer, without their dots.
 * @param fileTypeName Human-readable name for the file type, shown next to the
 * extensions in the desktop open dialog. Ignored in the browser.
 */
export const openFile = async (
  extensions: string[],
  fileTypeName?: string,
): Promise<OpenFileResult> => {
  if (isTauri()) {
    return openViaNativeDialog(extensions, fileTypeName);
  }
  return openViaFileInput(extensions);
};

const openViaNativeDialog = async (
  extensions: string[],
  fileTypeName?: string,
): Promise<OpenFileResult> => {
  // Loaded lazily so the browser build never pulls the Tauri plugins into its
  // bundle.
  const [{ open }, { readFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);

  const path = await open({
    multiple: false,
    directory: false,
    filters:
      extensions.length > 0
        ? [
            {
              name: fileTypeName ?? extensions.join(", ").toUpperCase(),
              extensions,
            },
          ]
        : undefined,
  });

  if (path === null) {
    return "cancelled";
  }

  // Tauri adds the path chosen in the open dialog to the filesystem scope, so
  // this read is permitted even though the app has no standing access to it.
  const bytes = await readFile(path);
  return { data: new Blob([bytes]), name: fileNameFromPath(path), path };
};

const openViaFileInput = (extensions: string[]): Promise<OpenFileResult> =>
  new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = extensions.map((extension) => `.${extension}`).join(",");

    // A picker that is dismissed rather than used fires "cancel" and never
    // "change", so the promise settles on whichever of the two arrives.
    input.addEventListener("change", () => {
      const file = input.files?.item(0);
      resolve(file ? { data: file, name: file.name } : "cancelled");
    });
    input.addEventListener("cancel", () => resolve("cancelled"));

    input.click();
  });

/** The last component of a path, whichever separator it uses. */
export const fileNameFromPath = (path: string): string =>
  path.split(/[\\/]/).pop() ?? path;

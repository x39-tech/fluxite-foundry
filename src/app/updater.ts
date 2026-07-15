import { isTauri } from "@tauri-apps/api/core";

export interface AvailableUpdate {
  version: string;
  /** Release notes, when the update manifest carries them. */
  notes?: string;
  /** Downloads and installs the update, then restarts into the new version. */
  install: () => Promise<void>;
}

/**
 * Ask the update server whether a newer version has been released.
 *
 * Always resolves to null in the browser, which updates itself simply by being
 * reloaded.
 *
 * @returns the available update, or null if this is already the latest version.
 * @throws if the update server could not be reached or its manifest was invalid.
 */
export const checkForUpdate = async (): Promise<AvailableUpdate | null> => {
  if (!isTauri()) {
    return null;
  }

  // Loaded lazily so the browser build never pulls the Tauri plugins into its
  // bundle.
  const { check } = await import("@tauri-apps/plugin-updater");

  const update = await check();
  if (!update) {
    return null;
  }

  return {
    version: update.version,
    notes: update.body,
    install: async () => {
      await update.downloadAndInstall();
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    },
  };
};

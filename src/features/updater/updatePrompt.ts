import { toast } from "sonner";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { AvailableUpdate, checkForUpdate } from "app/updater";
import { errorMessage } from "utils/utils";

const MESSAGES = {
  available: msg({
    id: "updater.available",
    message: "Version {version} is available",
  }),
  install: msg({ id: "updater.install", message: "Install and restart" }),
  downloading: msg({
    id: "updater.downloading",
    message: "Downloading version {version}...",
  }),
  installFailed: msg({
    id: "updater.installFailed",
    message: "Could not install version {version}: {reason}",
  }),
  checking: msg({ id: "updater.checking", message: "Checking for updates..." }),
  upToDate: msg({
    id: "updater.upToDate",
    message: "Fluxite Foundry is up to date",
  }),
  checkFailed: msg({
    id: "updater.checkFailed",
    message: "Could not check for updates: {reason}",
  }),
};

const offerUpdate = (update: AvailableUpdate) => {
  toast(
    i18n._({ ...MESSAGES.available, values: { version: update.version } }),
    {
      description: update.notes,
      // The user decides when to restart, so this must not time out.
      duration: Infinity,
      action: {
        label: i18n._(MESSAGES.install),
        onClick: () => void installUpdate(update),
      },
    },
  );
};

const installUpdate = async (update: AvailableUpdate) => {
  const progressToast = toast.loading(
    i18n._({ ...MESSAGES.downloading, values: { version: update.version } }),
  );
  try {
    // Restarts into the new version, so nothing after this runs on success.
    await update.install();
  } catch (error) {
    toast.error(
      i18n._({
        ...MESSAGES.installFailed,
        values: { version: update.version, reason: errorMessage(error) },
      }),
      { id: progressToast },
    );
  }
};

/**
 * Check for an update in the background, and only say anything if there is one.
 */
export const checkForUpdateOnStartup = async () => {
  try {
    const update = await checkForUpdate();
    if (update) {
      offerUpdate(update);
    }
  } catch (error) {
    console.warn(`Update check failed: ${errorMessage(error)}`);
  }
};

/**
 * Check for an update because the user asked, which means always reporting
 * back, including "nothing to do" and failures.
 */
export const checkForUpdateInteractively = async () => {
  const checkingToast = toast.loading(i18n._(MESSAGES.checking));
  try {
    const update = await checkForUpdate();
    if (update) {
      toast.dismiss(checkingToast);
      offerUpdate(update);
    } else {
      toast.success(i18n._(MESSAGES.upToDate), { id: checkingToast });
    }
  } catch (error) {
    toast.error(
      i18n._({
        ...MESSAGES.checkFailed,
        values: { reason: errorMessage(error) },
      }),
      { id: checkingToast },
    );
  }
};

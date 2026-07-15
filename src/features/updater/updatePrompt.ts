import { toast } from "sonner";
import { AvailableUpdate, checkForUpdate } from "app/updater";
import { errorMessage } from "utils/utils";

const offerUpdate = (update: AvailableUpdate) => {
  toast(`Version ${update.version} is available`, {
    description: update.notes,
    // The user decides when to restart, so this must not time out.
    duration: Infinity,
    action: {
      label: "Install and restart",
      onClick: () => void installUpdate(update),
    },
  });
};

const installUpdate = async (update: AvailableUpdate) => {
  const progressToast = toast.loading(
    `Downloading version ${update.version}...`,
  );
  try {
    // Restarts into the new version, so nothing after this runs on success.
    await update.install();
  } catch (error) {
    toast.error(
      `Could not install version ${update.version}: ${errorMessage(error)}`,
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
  const checkingToast = toast.loading("Checking for updates...");
  try {
    const update = await checkForUpdate();
    if (update) {
      toast.dismiss(checkingToast);
      offerUpdate(update);
    } else {
      toast.success("Fluxite Foundry is up to date", { id: checkingToast });
    }
  } catch (error) {
    toast.error(`Could not check for updates: ${errorMessage(error)}`, {
      id: checkingToast,
    });
  }
};

import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";
import { isMacOS } from "./platform";

/**
 * The macOS Tauri window hides its native title bar and draws the traffic light
 * buttons over the top-left corner of the webview, so the top nav bar has to
 * leave room for them there.
 */
export const applyNativeWindowControlsInset = async () => {
  if (!isTauri() || !isMacOS()) return;

  document.documentElement.dataset.windowControls = "macos-overlay";

  const appWindow = getCurrentWindow();

  const syncInset = async () => {
    const { dataset } = document.documentElement;
    // On fullscreen the traffic lights are no longer visible, so remove the
    // offset
    if (await appWindow.isFullscreen()) {
      delete dataset.windowControls;
    } else {
      dataset.windowControls = "macos-overlay";
    }
  };

  await syncInset();
  await appWindow.onResized(() => void syncInset());
};

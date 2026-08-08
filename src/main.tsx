import React from "react";
import ReactDOM from "react-dom/client";
import { enablePatches } from "immer";
import App from "./app/App";
import { applyNativeWindowControlsInset } from "./app/nativeWindowControls";
import { applyPlatformTag } from "./app/platform";
import { initDeviceClassEditorEffects } from "features/deviceClassEditor/effects";
import { deviceClassAssets } from "features/deviceClassEditor/assets";
import {
  assetIdsOfDocument,
  initAssetLifecycle,
  cleanupAssets,
} from "./app/assetLifecycle";
import { initUndo } from "./app/undo";
import { initDocumentFiles } from "./app/documentFile";
import {
  UiLocaleProvider,
  activateUiLocale,
  initialUiLocale,
} from "./app/i18n";
import "./index.css";
import "./flexlayout.scss";

enablePatches();
applyPlatformTag();
initAssetLifecycle([deviceClassAssets]);
initUndo({
  documentAssetIds: assetIdsOfDocument,
  onAssetsReleased: cleanupAssets,
});
initDocumentFiles();
initDeviceClassEditorEffects();
void applyNativeWindowControlsInset();

// Awaited so that the first render already has a catalog to read from.
await activateUiLocale(initialUiLocale());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <UiLocaleProvider>
      <App />
    </UiLocaleProvider>
  </React.StrictMode>,
);

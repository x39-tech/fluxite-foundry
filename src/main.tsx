import React from "react";
import ReactDOM from "react-dom/client";
import { enablePatches } from "immer";
import App from "./app/App";
import { applyNativeWindowControlsInset } from "./app/nativeWindowControls";
import { applyPlatformTag } from "./app/platform";
import { initDeviceClassEditorEffects } from "features/deviceClassEditor/effects";
import "./index.css";
import "./flexlayout.scss";

enablePatches();
applyPlatformTag();
initDeviceClassEditorEffects();
void applyNativeWindowControlsInset();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

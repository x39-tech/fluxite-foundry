import React from "react";
import ReactDOM from "react-dom/client";
import { enablePatches } from "immer";
import App from "./app/App";
import "./index.css";

import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "flexlayout-blueprint.scss";

enablePatches();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

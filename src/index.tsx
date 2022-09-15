import React from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./app/App";
import store from "./app/store";
import reportWebVitals from "reportWebVitals";

import "normalize.css/normalize.css";
import "@blueprintjs/core/lib/css/blueprint.css";
import "@blueprintjs/popover2/lib/css/blueprint-popover2.css";
import "@blueprintjs/icons/lib/css/blueprint-icons.css";
import "react-mosaic-component/react-mosaic-component.css";

const root = createRoot(document.getElementById("root")!);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

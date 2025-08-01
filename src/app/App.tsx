import { useEffect } from "react";
import { Classes } from "@blueprintjs/core";
import { DeviceClassEditor } from "features/deviceClassEditor/DeviceClassEditor";
import { TopNavBar } from "features/topNavBar/TopNavBar";
import { udrDatabaseIsEmpty } from "udr/udrDatabase";
import { LibraryErrorDialog } from "./libraryErrorDialog";
import { useDarkMode, useUdrDatabase } from "./store";
import { EditorType } from "./state";
import { useOpenEditors } from "features/topNavBar/state";
import "./App.scss";

const EDITORS: Record<EditorType, () => JSX.Element> = {
  [EditorType.DEVICE_CLASS]: () => <DeviceClassEditor />,
};

export const App = () => {
  const database = useUdrDatabase();
  const darkMode = useDarkMode();
  const editors = useOpenEditors();
  const currentEditor = editors.editors[editors.selectedEditor];

  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className={darkMode ? "app " + Classes.DARK : "app"}>
      <TopNavBar />
      <div className="display-area">
        {currentEditor ? EDITORS[currentEditor.type]() : <div />}
        <LibraryErrorDialog show={udrDatabaseIsEmpty(database)} />
      </div>
    </div>
  );
};

export default App;

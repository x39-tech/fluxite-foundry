import { useEffect, JSX } from "react";
import { useOpenEditors } from "features/topNavBar/state";
import { DeviceClassEditor } from "features/deviceClassEditor/DeviceClassEditor";
import { TopNavBar } from "features/topNavBar/TopNavBar";
import { Toaster } from "components/scn-ui/Sonner";
import { codexDatabaseIsEmpty } from "codex/codexDatabase";
import { LibraryErrorDialog } from "./libraryErrorDialog";
import {
  useDarkMode,
  useUdrDatabase,
  setSystemDarkModePreference,
} from "./store";
import { EditorType, editorTypes } from "./persistentState";
import "./App.scss";

const EDITORS: Record<EditorType, () => JSX.Element> = {
  [editorTypes.DEVICE_CLASS]: () => <DeviceClassEditor />,
};

export const App = () => {
  const database = useUdrDatabase();
  const darkMode = useDarkMode();
  const editors = useOpenEditors();
  const currentEditor = editors.editors[editors.selectedEditor];

  // Apply dark mode class to body
  useEffect(() => {
    const root = window.document.body;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Listen for system dark mode preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mediaQuery) return;

    const handler = (e: MediaQueryListEvent) =>
      setSystemDarkModePreference(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  return (
    <div className="app">
      <TopNavBar />
      <div className="display-area">
        {currentEditor ? EDITORS[currentEditor.type]() : <div />}
        <LibraryErrorDialog show={codexDatabaseIsEmpty(database)} />
      </div>
      <Toaster />
    </div>
  );
};

export default App;

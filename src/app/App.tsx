import { useEffect, JSX } from "react";
import { DeviceClassEditor } from "features/deviceClassEditor/DeviceClassEditor";
import { TopNavBar } from "features/topNavBar/TopNavBar";
import { Toaster } from "components/scn-ui/Sonner";
import { checkForUpdateOnStartup } from "features/updater/updatePrompt";
import { libraryStoreIsEmpty } from "codex/libraryStore";
import { LibraryErrorDialog } from "./libraryErrorDialog";
import {
  useDarkMode,
  useLibraryStore,
  setSystemDarkModePreference,
} from "./store";
import { DocumentType, documentTypes } from "./persistentState";
import { useCurrentDocumentType } from "./documents";
import "./App.scss";

const EDITORS: Record<DocumentType, () => JSX.Element> = {
  [documentTypes.DEVICE_CLASS]: () => <DeviceClassEditor />,
};

export const App = () => {
  const libraries = useLibraryStore();
  const darkMode = useDarkMode();
  const currentDocumentType = useCurrentDocumentType();

  // Apply dark mode class to body
  useEffect(() => {
    const root = window.document.body;
    if (darkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [darkMode]);

  // Offer the user a newer desktop version if one has been released. No-ops in
  // the browser.
  useEffect(() => {
    void checkForUpdateOnStartup();
  }, []);

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
        {currentDocumentType ? EDITORS[currentDocumentType]() : <div />}
        <LibraryErrorDialog show={libraryStoreIsEmpty(libraries)} />
      </div>
      <Toaster />
    </div>
  );
};

export default App;

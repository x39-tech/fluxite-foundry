import { useMemo } from "react";
import { Classes } from "@blueprintjs/core";
import { DeviceClassEditor } from "features/deviceClassEditor/DeviceClassEditor";
import { DeviceClassEditorState } from "features/deviceClassEditor/deviceClassEditorState";
import { useAppSelector } from "./hooks";
import { TopNavBar } from "features/topNavBar/TopNavBar";
import {
  UdrDatabase,
  loadDefaultLibraries,
  udrDatabaseIsEmpty,
} from "udr/udrDatabase";
import { LibraryErrorDialog } from "./libraryErrorDialog";
import "./App.scss";

function getEditorComponent(
  id: string,
  editor: DeviceClassEditorState,
  database: Readonly<UdrDatabase>,
) {
  return (
    <DeviceClassEditor
      key={id}
      title={editor.basicData.info.model.name}
      database={database}
    />
  );
}

export const App = () => {
  const defaultLibs = useMemo(loadDefaultLibraries, []);

  const settings = useAppSelector((state) => state.appSettings);
  const editors = useAppSelector((state) => {
    return {
      openEditors: state.editors.openEditors,
      editorTabOrder: state.editors.editorTabOrder,
      selectedEditor: state.editors.selectedEditor,
    };
  });
  const currentEditor = editors.openEditors[editors.selectedEditor];

  return (
    <div className={settings.darkMode ? "app " + Classes.DARK : "app"}>
      <TopNavBar />
      <div className="display-area">
        {currentEditor ? (
          getEditorComponent(editors.selectedEditor, currentEditor, defaultLibs)
        ) : (
          <div />
        )}
        <LibraryErrorDialog show={udrDatabaseIsEmpty(defaultLibs)} />
      </div>
    </div>
  );
};

export default App;

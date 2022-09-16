import React from "react";
import { Classes } from "@blueprintjs/core";
import { DeviceClassEditor } from "features/deviceClassEditor/DeviceClassEditor";
import { DeviceClassEditorState } from "features/deviceClassEditor/deviceClassEditorState";
import "./App.scss";
import { useAppSelector } from "./hooks";
import { TopNavBar } from "features/topNavBar/TopNavBar";

function getEditorComponent(id: string, editor: DeviceClassEditorState) {
  return <DeviceClassEditor key={id} title={editor.deviceClassId} />;
}

export const App: React.FC<{}> = () => {
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
          getEditorComponent(editors.selectedEditor, currentEditor)
        ) : (
          <div />
        )}
      </div>
    </div>
  );
};

export default App;

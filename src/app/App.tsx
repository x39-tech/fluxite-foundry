import React from "react";
import { Classes, Divider } from "@blueprintjs/core";
import { FixtureEditor } from "features/fixtureEditor/FixtureEditor";
import { Fixture3DView } from "features/fixture3DView/Fixture3DView";
import { FixtureEditorState } from "features/fixtureEditor/fixtureEditorState";
import "./App.scss";
import { useAppSelector } from "./hooks";
import { TopNavBar } from "features/topNavBar/TopNavBar";

function getEditorComponent(id: string, editor: FixtureEditorState) {
  return <FixtureEditor key={id} title={editor.deviceClassId} />;
}

export const App: React.FC<{}> = () => {
  const settings = useAppSelector((state) => state.appSettings);
  const editors = useAppSelector((state) => {
    return {
      openEditors: state.fixtureEditor.openEditors,
      editorTabOrder: state.fixtureEditor.editorTabOrder,
      selectedEditor: state.fixtureEditor.selectedEditor,
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
        {settings.threeDViewEnabled ? (
          <>
            <Divider />
            <Fixture3DView />
          </>
        ) : (
          <></>
        )}
      </div>
    </div>
  );
};

export default App;

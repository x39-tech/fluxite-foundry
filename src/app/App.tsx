import React from "react";
import { Alignment, Button, Classes, Divider, Navbar } from "@blueprintjs/core";
import { EditorTitleTab } from "utils/components/EditorTitleTab/EditorTitleTab";
import { FixtureEditor } from "features/fixtureEditor/FixtureEditor";
import { SettingsMenu } from "features/appSettings/SettingsMenu";
import { Fixture3DView } from "features/fixture3DView/Fixture3DView";
import {
  createNewEditor,
  deleteEditor,
  setSelectedEditor,
} from "features/fixtureEditor/fixtureEditorSlice";
import { EditorTabState } from "utils/editorTabState";
import "./App.css";
import { useAppDispatch, useAppSelector } from "./hooks";

function getEditorComponent(id: string, editor: EditorTabState) {
  return <FixtureEditor key={id} {...editor} />;
}

export const App: React.FC<{}> = () => {
  const editors = useAppSelector((state) => {
    return {
      openEditors: state.fixtureEditor.openEditors,
      editorTabOrder: state.fixtureEditor.editorTabOrder,
      selectedEditor: state.fixtureEditor.selectedEditor,
    };
  });
  const currentEditor = editors.openEditors[editors.selectedEditor];
  const settings = useAppSelector((state) => state.appSettings);

  const dispatch = useAppDispatch();

  return (
    <div className={settings.darkMode ? "app " + Classes.DARK : "app"}>
      <Navbar>
        <Navbar.Group align={Alignment.LEFT}>
          <Navbar.Heading>UDR Builder</Navbar.Heading>
          <Navbar.Divider />
          {editors.editorTabOrder.map((id) => {
            const editor = editors.openEditors[id];
            return (
              <EditorTitleTab
                key={id}
                name={editor.name}
                id={id}
                active={id === editors.selectedEditor}
                onSelect={(id) => {
                  dispatch(setSelectedEditor(id));
                }}
                onDelete={(id) => {
                  dispatch(deleteEditor(id));
                }}
              />
            );
          })}
          <Button
            icon="add"
            onClick={() => {
              dispatch(createNewEditor());
            }}
          />
        </Navbar.Group>
        <Navbar.Group align={Alignment.RIGHT}>
          <SettingsMenu />
        </Navbar.Group>
      </Navbar>
      <div className="display-area">
        {getEditorComponent(editors.selectedEditor, currentEditor)}
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

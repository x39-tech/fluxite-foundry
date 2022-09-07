import React from "react";
import {
  Alignment,
  Button,
  Callout,
  Classes,
  Divider,
  Navbar,
} from "@blueprintjs/core";
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
import "./App.scss";
import { useAppDispatch, useAppSelector } from "./hooks";
import { Popover2 } from "@blueprintjs/popover2";

function getEditorComponent(id: string, editor: EditorTabState) {
  return <FixtureEditor key={id} title={editor.name} />;
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
          <Popover2
            content={<Callout>Get started by adding a new editor!</Callout>}
            isOpen={currentEditor === undefined}
          >
            <Button
              icon="add"
              aria-label="Add New Editor"
              onClick={() => {
                dispatch(createNewEditor());
              }}
            />
          </Popover2>
        </Navbar.Group>
        <Navbar.Group align={Alignment.RIGHT}>
          <SettingsMenu />
        </Navbar.Group>
      </Navbar>
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

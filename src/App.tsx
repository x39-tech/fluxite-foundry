import React from "react";
import { Alignment, Button, Divider, Navbar } from "@blueprintjs/core";
import { v4 as uuidv4 } from "uuid";
import { EditorTitleTab } from "components/EditorTitleTab/EditorTitleTab";
import { FixtureEditor } from "components/FixtureEditor/FixtureEditor";
import { SettingsMenu } from "components/SettingsMenu/SettingsMenu";
import { Fixture3DView } from "components/Fixture3DView/Fixture3DView";
import {
  AppSettings,
  loadAppSettings,
  saveAppSettings,
} from "utils/app_settings";
import "./App.css";
import { DeviceClass } from "udr/objects/device_class";
import { getDefaultDeviceClass } from "udr/udr";

interface EditorState {
  id: string;
  name: string;
  udr: DeviceClass;
  structuredItems: Array<string>;
}

interface AppState {
  openEditors: EditorState[];
  selectedEditor: string;
  settings: AppSettings;
}

function getNewEditor(id: string, name: string): EditorState {
  const defaultDevClass = getDefaultDeviceClass();
  return {
    id: id,
    name: name,
    udr: defaultDevClass,
    structuredItems: defaultDevClass.structuredItems
      ? Object.keys(defaultDevClass.structuredItems)
      : [],
  };
}

function handleEditorStructuredItemChanged(
  editor: EditorState,
  structuredItemName: string,
  newValue: object
) {
  console.log(`Value changed: ${structuredItemName} ${newValue}`);
}

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      openEditors: [
        getNewEditor("1f1c3350-1a14-4a4c-b90f-d8b076b4ae02", "My Fixture"),
        getNewEditor("1f1c3350-1a14-4a4c-b90f-d8b076b4ae03", "My Fixture 2"),
      ],
      selectedEditor: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02",
      settings: loadAppSettings(),
    };
  }

  handleNewEditor() {
    const newId = uuidv4();
    this.setState({
      openEditors: this.state.openEditors.concat([
        getNewEditor(newId, "New Device"),
      ]),
      selectedEditor: newId,
    });
  }

  handleDeleteEditor(idToDelete: string) {
    const index = this.state.openEditors.findIndex(({ id }) => {
      return id === idToDelete;
    });
    const newId: string =
      this.state.openEditors.length === 1
        ? ""
        : index === this.state.openEditors.length - 1
        ? this.state.openEditors[index - 1].id
        : this.state.openEditors[index + 1].id;

    this.setState({
      openEditors: this.state.openEditors.filter((editor: EditorState) => {
        return editor.id !== idToDelete;
      }),
      selectedEditor: newId,
    });
  }

  getSelectedEditor() {
    const editor = this.state.openEditors.find(({ id }) => {
      return id === this.state.selectedEditor;
    });
    return editor ? (
      <FixtureEditor
        key={editor.id}
        onStructuredItemChanged={(structuredItemName, newValue) => {
          handleEditorStructuredItemChanged(
            editor,
            structuredItemName,
            newValue
          );
        }}
        {...editor}
      />
    ) : (
      <></>
    );
  }

  setSelectedEditor(id: string) {
    this.setState({ selectedEditor: id });
  }

  handleSettingsChanged(newSettings: AppSettings) {
    saveAppSettings(newSettings);
    this.setState({
      settings: newSettings,
    });
  }

  render() {
    return (
      <div className={this.state.settings.darkMode ? "app bp4-dark" : "app"}>
        <Navbar>
          <Navbar.Group align={Alignment.LEFT}>
            <Navbar.Heading>UDR Builder</Navbar.Heading>
            <Navbar.Divider />
            {this.state.openEditors.map(({ id, name }) => {
              return (
                <EditorTitleTab
                  key={id}
                  name={name}
                  id={id}
                  active={id === this.state.selectedEditor}
                  onSelect={(id) => this.setSelectedEditor(id)}
                  onDelete={(id) => this.handleDeleteEditor(id)}
                />
              );
            })}
            <Button icon="add" onClick={() => this.handleNewEditor()} />
          </Navbar.Group>
          <Navbar.Group align={Alignment.RIGHT}>
            <SettingsMenu
              settings={this.state.settings}
              onSettingsChanged={(newSettings) =>
                this.handleSettingsChanged(newSettings)
              }
            />
          </Navbar.Group>
        </Navbar>
        <div className="display-area">
          {this.getSelectedEditor()}
          {this.state.settings.threeDViewEnabled ? (
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
  }
}

export default App;

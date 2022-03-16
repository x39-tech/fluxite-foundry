import React, { ReactElement } from "react";
import { Alignment, Button, Navbar } from "@blueprintjs/core";
import { v4 as uuidv4 } from "uuid";
import { EditorTitleTab } from "./components/EditorTitleTab";
import { FixtureEditor } from "./components/FixtureEditor/FixtureEditor";
import "./App.css";

interface EditorState {
  id: string;
  name: string;
}

interface AppState {
  openEditors: EditorState[];
  selectedEditor: string;
  threeDViewEnabled: boolean;
}

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      openEditors: [
        { id: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02", name: "My Fixture" },
        { id: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae03", name: "My Fixture 2" },
      ],
      selectedEditor: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02",
      threeDViewEnabled: false
    };

    this.handleNewEditor = this.handleNewEditor.bind(this);
    this.handleDeleteEditor = this.handleDeleteEditor.bind(this);
    this.setSelectedEditor = this.setSelectedEditor.bind(this);
  }

  handleNewEditor() {
    const newId = uuidv4();
    this.setState({
      openEditors: this.state.openEditors.concat([
        { id: newId, name: "New Device" },
      ]),
      selectedEditor: newId,
      threeDViewEnabled: this.state.threeDViewEnabled
    });
  }

  handleDeleteEditor(idToDelete: string) {
    // NOTE: Doesn't work currently because the onClick for the entire button is firing after onClick from the delete icon, need to debug
    const index = this.state.openEditors.findIndex(({ id }) => { return id === idToDelete })
    const newId: string = (this.state.openEditors.length == 1 ? "" : (index == (this.state.openEditors.length - 1) ? this.state.openEditors[index - 1].id : this.state.openEditors[index + 1].id));
    this.setState({
      openEditors: this.state.openEditors.filter((editor: EditorState) => {
        return editor.id !== idToDelete;
      }),
      selectedEditor: newId
    });
  }

  getSelectedEditor(): ReactElement<any, any> {
    const editor = this.state.openEditors.find(({ id }) => { return id === this.state.selectedEditor });
    return editor ? <FixtureEditor key={editor.id} {...editor} /> : <></>;
  }

  setSelectedEditor(id: string) {
    this.setState({ selectedEditor: id });
  }

  render() {
    return (
      <div className="app">
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
                  onSelect={this.setSelectedEditor}
                  onDelete={this.handleDeleteEditor}
                />
              );
            })}
            <Button icon="add" onClick={this.handleNewEditor} />
          </Navbar.Group>
          <Navbar.Group align={Alignment.RIGHT}>
            <Button icon="cog" />
          </Navbar.Group>
        </Navbar>
        <div className="display-area">
          {this.getSelectedEditor()}
        </div>
      </div>
    );
  }
}

export default App;

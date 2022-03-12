import React from "react";
import { Alignment, Button, Navbar } from "@blueprintjs/core";
import { v4 as uuidv4 } from "uuid";
import { BrowserRouter, Route, Link } from "react-router-dom";
import { EditorTitleTab } from "./components/EditorTitleTab";
import { FixtureEditor } from "./components/FixtureEditor/FixtureEditor";
import "./App.css";

interface EditorState {
  id: string;
  name: string;
}
interface AppState {
  openEditors: EditorState[];
}

class App extends React.Component<{}, AppState> {
  constructor(props: {}) {
    super(props);
    this.state = {
      openEditors: [
        { id: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae02", name: "My Fixture" },
        { id: "1f1c3350-1a14-4a4c-b90f-d8b076b4ae03", name: "My Fixture 2" },
      ],
    };

    this.handleDeleteEditor = this.handleDeleteEditor.bind(this);
    this.handleNewEditor = this.handleNewEditor.bind(this);
  }

  handleNewEditor() {
    this.setState({
      openEditors: this.state.openEditors.concat([
        { id: uuidv4(), name: "New Device" },
      ]),
    });
  }

  handleDeleteEditor(id: string) {
    this.setState({
      openEditors: this.state.openEditors.filter((editor: EditorState) => {
        return editor.id !== id;
      }),
    });
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
                  onDelete={this.handleDeleteEditor}
                />
              );
            })}
            <Button icon="add" onClick={this.handleNewEditor} />
          </Navbar.Group>
        </Navbar>
        <div className="display-area">
          {this.state.openEditors.map((props) => {
            return <FixtureEditor key={props.id} {...props} />;
          })}
        </div>
      </div>
    );
  }
}

export default App;

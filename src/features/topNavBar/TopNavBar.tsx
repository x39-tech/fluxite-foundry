import { Alignment, Button, Navbar } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { useAppDispatch, useAppSelector } from "app/hooks";
import {
  newEditorCreated,
  editorDeleted,
  selectedEditorChanged,
} from "features/deviceClassEditor/deviceClassEditorSlice";
import { EditorTitleTab } from "utils/components/EditorTitleTab/EditorTitleTab";
import { AppMainMenu } from "./AppMainMenu";
import "./TopNavBar.css";

export const TopNavBar = () => {
  const editors = useAppSelector((state) => {
    return {
      openEditors: state.editors.openEditors,
      editorTabOrder: state.editors.editorTabOrder,
      selectedEditor: state.editors.selectedEditor,
    };
  });
  const currentEditor = editors.openEditors[editors.selectedEditor];

  const dispatch = useAppDispatch();

  return (
    <>
      <Navbar fixedToTop={true}>
        <Navbar.Group align={Alignment.LEFT}>
          <Navbar.Heading>UDR Builder</Navbar.Heading>
          <Navbar.Divider />
          {editors.editorTabOrder.map((id) => {
            const editor = editors.openEditors[id];
            return (
              <EditorTitleTab
                key={id}
                name={editor.deviceClassId}
                id={id}
                active={id === editors.selectedEditor}
                onSelect={(id) => {
                  dispatch(selectedEditorChanged(id));
                }}
                onDelete={(id) => {
                  dispatch(editorDeleted(id));
                }}
              />
            );
          })}
          <Popover2
            content={
              <div className="get-started-callout">
                <p>
                  Get started by adding a new editor, or import an existing UDR
                  document using the import option to the right.
                </p>
              </div>
            }
            isOpen={currentEditor === undefined}
            position="bottom"
          >
            <Button
              icon="add"
              aria-label="Add New Editor"
              onClick={() => {
                dispatch(newEditorCreated());
              }}
            />
          </Popover2>
        </Navbar.Group>
        <Navbar.Group
          align={Alignment.RIGHT}
          className="navbar-right-button-group"
        >
          <AppMainMenu />
        </Navbar.Group>
      </Navbar>
    </>
  );
};

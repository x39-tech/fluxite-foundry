import { useState } from "react";
import { Alignment, Button, Navbar } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { useAppDispatch, useAppSelector } from "app/hooks";
import { SettingsMenu } from "features/appSettings/SettingsMenu";
import {
  createNewEditor,
  deleteEditor,
  setSelectedEditor,
} from "features/fixtureEditor/fixtureEditorSlice";
import { EditorTitleTab } from "utils/components/EditorTitleTab/EditorTitleTab";
import { ImportUdrDialog } from "./ImportUdrDialog";
import "./TopNavBar.css";
import { ExportUdrDialog } from "./ExportUdrDialog";

export const TopNavBar = () => {
  const editors = useAppSelector((state) => {
    return {
      openEditors: state.fixtureEditor.openEditors,
      editorTabOrder: state.fixtureEditor.editorTabOrder,
      selectedEditor: state.fixtureEditor.selectedEditor,
    };
  });
  const currentEditor = editors.openEditors[editors.selectedEditor];

  const dispatch = useAppDispatch();

  const [importUdrDialogIsOpen, setImportUdrDialogIsOpen] = useState(false);
  const [exportUdrDialogIsOpen, setExportUdrDialogIsOpen] = useState(false);

  return (
    <>
      <Navbar>
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
                  dispatch(setSelectedEditor(id));
                }}
                onDelete={(id) => {
                  dispatch(deleteEditor(id));
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
                dispatch(createNewEditor());
              }}
            />
          </Popover2>
        </Navbar.Group>
        <Navbar.Group
          align={Alignment.RIGHT}
          className="navbar-right-button-group"
        >
          <Button
            icon="import"
            onClick={() => setImportUdrDialogIsOpen(true)}
          />
          <Button
            icon="export"
            onClick={() => setExportUdrDialogIsOpen(true)}
          />
          <SettingsMenu />
        </Navbar.Group>
      </Navbar>
      <ImportUdrDialog
        isOpen={importUdrDialogIsOpen}
        onClose={() => setImportUdrDialogIsOpen(false)}
      />
      <ExportUdrDialog
        isOpen={exportUdrDialogIsOpen}
        onClose={() => setExportUdrDialogIsOpen(false)}
      />
    </>
  );
};

import { PlusCircleIcon } from "@heroicons/react/24/outline";
import { Alignment, Navbar } from "@blueprintjs/core";
import { Popover2 } from "@blueprintjs/popover2";
import { APP_NAME } from "appInfo";
import { Button } from "components/scn-ui/Button";
import { EditorTitleTab } from "components/EditorTitleTab/EditorTitleTab";
import { AppMainMenu } from "./AppMainMenu";
import { createDeviceClassEditor, useEditorNames } from "./state";
import { setSelectedEditor, useOpenEditors, deleteEditor } from "./state";

export const TopNavBar = () => {
  const editors = useOpenEditors();
  const editorNames = useEditorNames();
  const currentEditor = editors.editors[editors.selectedEditor];

  return (
    <Navbar fixedToTop={true}>
      <Navbar.Group align={Alignment.LEFT}>
        <Navbar.Heading>{APP_NAME}</Navbar.Heading>
        <Navbar.Divider />
        {editors.editors.map((editor, index) => {
          const name = editorNames[index] ?? "unknown";
          return (
            <EditorTitleTab
              key={editor.id}
              name={name}
              id={editor.id}
              active={index === editors.selectedEditor}
              onSelect={() => setSelectedEditor(index)}
              onDelete={() => deleteEditor(index)}
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
            size="icon"
            variant="secondary"
            className="size-8"
            aria-label="Add New Editor"
            onClick={createDeviceClassEditor}
          >
            <PlusCircleIcon className="size-5" />
          </Button>
        </Popover2>
      </Navbar.Group>
      <Navbar.Group align={Alignment.RIGHT} className="ml-2">
        <AppMainMenu />
      </Navbar.Group>
    </Navbar>
  );
};

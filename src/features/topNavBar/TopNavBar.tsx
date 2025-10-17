import { PlusCircleIcon } from "@heroicons/react/24/outline";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { Button } from "components/scn-ui/Button";
import { Separator } from "components/scn-ui/Separator";
import { EditorTitleTab } from "./EditorTitleTab";
import { AppMainMenu } from "./AppMainMenu";
import { NavbarDivider } from "./NavbarDivider";
import { createDeviceClassEditor, useEditorNames } from "./state";
import { setSelectedEditor, useOpenEditors, deleteEditor } from "./state";

// TODO: figure out a way to avoid the duplication with the SVG in the public directory
const appIconSvg = (
  <svg
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M20.5 15.8V8.2a1.91 1.91 0 0 0-.944-1.645l-6.612-3.8a1.88 1.88 0 0 0-1.888 0l-6.612 3.8A1.9 1.9 0 0 0 3.5 8.2v7.602a1.91 1.91 0 0 0 .944 1.644l6.612 3.8a1.88 1.88 0 0 0 1.888 0l6.612-3.8A1.9 1.9 0 0 0 20.5 15.8" />
    <path d="M14 12a2 2 0 1 1-4 0m4 0a2 2 0 1 0-4 0m4 0h3m-7 0H7" />
  </svg>
);

export const TopNavBar = () => {
  const editors = useOpenEditors();
  const editorNames = useEditorNames();
  const currentEditor = editors.editors[editors.selectedEditor];

  return (
    <>
      <div className="fixed top-0 left-0 right-0 flex items-center h-[50px]">
        <div className="pl-3 flex gap-1 items-center">
          {appIconSvg}
          <div className="text-lg">
            <span className="font-bold text-primary">FLUXITE</span>{" "}
            <span className="text-muted-foreground">Foundry</span>
          </div>
        </div>
        <NavbarDivider />
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
        <Tooltip open={currentEditor === undefined}>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="size-8"
              aria-label="Add New Editor"
              onClick={createDeviceClassEditor}
            >
              <PlusCircleIcon className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-md max-w-[260px] p-4">
            Get started by adding a new editor, or import an existing UDR
            document using the import option to the right.
          </TooltipContent>
        </Tooltip>
        <div className="flex-grow" />
        <div className="mr-4">
          <AppMainMenu />
        </div>
      </div>
      <Separator className="shadow-[0px_2px_4px_-1px_#0000000F,0px_4px_6px_-1px_#0000001A] fixed top-[50px] z-1" />
    </>
  );
};

import { PlusIcon } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "components/scn-ui/Tooltip";
import { Button } from "components/scn-ui/Button";
import { AppLogo } from "components/icons/AppLogo";
import { Separator } from "components/scn-ui/Separator";
import { EditorTitleTab } from "./EditorTitleTab";
import { AppMainMenu } from "./AppMainMenu";
import { NavbarDivider } from "./NavbarDivider";
import {
  closeDocument,
  createDeviceClassEditor,
  setSelectedDocument,
  useDocumentNames,
  useOpenDocumentIds,
  useDocumentTypes,
  useSelectedDocumentId,
} from "./state";

export const TopNavBar = () => {
  const openDocumentIds = useOpenDocumentIds();
  const documentNames = useDocumentNames();
  const documentTypes = useDocumentTypes();
  const selectedDocumentId = useSelectedDocumentId();

  return (
    <>
      <div
        className="fixed top-0 left-0 right-0 flex items-center h-[50px]"
        data-tauri-drag-region
      >
        <div
          className="pl-[max(0.75rem,var(--titlebar-controls-inset))] flex gap-1 items-center"
          data-tauri-drag-region
        >
          <AppLogo />
          <div className="text-lg">
            <span className="font-bold text-primary">FLUXITE</span>{" "}
            <span className="text-muted-foreground">Foundry</span>
          </div>
        </div>
        <NavbarDivider />
        {openDocumentIds.map((id, index) => {
          const name = documentNames[index] ?? "unknown";
          const type = documentTypes[index];
          return (
            <EditorTitleTab
              key={id}
              name={name}
              type={type}
              id={id}
              active={id === selectedDocumentId}
              onSelect={() => setSelectedDocument(id)}
              onDelete={() => closeDocument(id)}
            />
          );
        })}
        <Tooltip open={selectedDocumentId === undefined}>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="size-8 text-primary"
              aria-label="Add New Editor"
              onClick={createDeviceClassEditor}
            >
              <PlusIcon className="size-5 stroke-2" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-md max-w-[260px] p-4">
            Get started by adding a new editor, or import an existing Fluxite
            Codex file using the import option to the right.
          </TooltipContent>
        </Tooltip>
        <div className="flex-grow self-stretch" data-tauri-drag-region />
        <div className="mr-4">
          <AppMainMenu />
        </div>
      </div>
      <Separator className="shadow-[0px_2px_4px_#0000000F,0px_4px_6px_#0000001A] fixed top-[50px] z-1" />
    </>
  );
};

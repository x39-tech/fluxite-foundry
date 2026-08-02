import { Undo2Icon, Redo2Icon } from "lucide-react";
import { useCurrentDocumentId } from "app/documents";
import { isMacOS } from "app/platform";
import { redo, undo, useRedoEntry, useUndoEntry } from "app/undo";
import {
  DropdownMenuItem,
  DropdownMenuShortcut,
} from "components/scn-ui/DropdownMenu";

/**
 * Undo and redo for the document being edited, naming the change they would
 * put back.
 */
export const UndoRedoMenuItems = () => {
  const documentId = useCurrentDocumentId();
  const undoEntry = useUndoEntry(documentId);
  const redoEntry = useRedoEntry(documentId);

  return (
    <>
      <DropdownMenuItem
        disabled={!undoEntry || documentId === undefined}
        onClick={() => documentId !== undefined && undo(documentId)}
      >
        <Undo2Icon className="size-5" />
        {undoEntry && undoEntry.label ? `Undo ${undoEntry.label}` : "Undo"}
        <DropdownMenuShortcut>
          {isMacOS() ? "⌘Z" : "Ctrl+Z"}
        </DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!redoEntry || documentId === undefined}
        onClick={() => documentId !== undefined && redo(documentId)}
      >
        <Redo2Icon className="size-5" />
        {redoEntry && redoEntry.label ? `Redo ${redoEntry.label}` : "Redo"}
        <DropdownMenuShortcut>
          {isMacOS() ? "⇧⌘Z" : "Ctrl+Y"}
        </DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
};

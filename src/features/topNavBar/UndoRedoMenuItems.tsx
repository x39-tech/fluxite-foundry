import { Undo2Icon, Redo2Icon } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useLingui } from "@lingui/react";
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
  const { _ } = useLingui();

  // For better translation placeholders
  const undoAction = undoEntry?.label ? _(undoEntry.label) : undefined;
  const redoAction = redoEntry?.label ? _(redoEntry.label) : undefined;

  return (
    <>
      <DropdownMenuItem
        disabled={!undoEntry || documentId === undefined}
        onClick={() => documentId !== undefined && undo(documentId)}
      >
        <Undo2Icon className="size-5" />
        {undoAction ? (
          <Trans id="menu.undo.named">Undo {undoAction}</Trans>
        ) : (
          <Trans id="menu.undo">Undo</Trans>
        )}
        <DropdownMenuShortcut>
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          {isMacOS() ? "⌘Z" : "Ctrl+Z"}
        </DropdownMenuShortcut>
      </DropdownMenuItem>
      <DropdownMenuItem
        disabled={!redoEntry || documentId === undefined}
        onClick={() => documentId !== undefined && redo(documentId)}
      >
        <Redo2Icon className="size-5" />
        {redoAction ? (
          <Trans id="menu.redo.named">Redo {redoAction}</Trans>
        ) : (
          <Trans id="menu.redo">Redo</Trans>
        )}
        <DropdownMenuShortcut>
          {/* eslint-disable-next-line lingui/no-unlocalized-strings */}
          {isMacOS() ? "⇧⌘Z" : "Ctrl+Y"}
        </DropdownMenuShortcut>
      </DropdownMenuItem>
    </>
  );
};

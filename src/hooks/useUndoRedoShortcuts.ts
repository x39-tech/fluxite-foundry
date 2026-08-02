import { useEffect } from "react";
import { useCurrentDocumentId } from "app/documents";
import { redo, undo } from "app/undo";

// Undo and redo are per document, so a shortcut applies to the document that is
// currently active.
export function useUndoRedoShortcuts() {
  const documentId = useCurrentDocumentId();

  useEffect(() => {
    if (documentId === undefined) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      // A field being edited has its own undo, and the user means that one.
      if (isEditingText(event.target)) {
        return;
      }

      const action = shortcutAction(event);
      if (!action) {
        return;
      }

      event.preventDefault();
      if (action === "undo") {
        undo(documentId);
      } else {
        redo(documentId);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [documentId]);
}

/**
 * Detects a reasonable union of undo/redo shortcuts across all major platforms:
 * either cmd-z or ctrl-z for undo, and either cmd-shift-z or ctrl-y for redo.
 */
function shortcutAction(event: KeyboardEvent): "undo" | "redo" | undefined {
  const modifier = event.metaKey || event.ctrlKey;
  if (!modifier || event.altKey) {
    return undefined;
  }

  const key = event.key.toLowerCase();
  if (key === "z") {
    return event.shiftKey ? "redo" : "undo";
  }
  if (key === "y" && !event.shiftKey) {
    return "redo";
  }

  return undefined;
}

function isEditingText(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement
  );
}

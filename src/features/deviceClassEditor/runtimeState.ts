// Access to the runtime state of each open device class editor.
//
// Use the helpers in this file to read and write the runtime sttate for a
// single device class editor, rather than selecting from the entire runtime
// store.

import { EntityId } from "app/persistentState";
import {
  AppRuntimeState,
  DeviceClassEditorRuntimeState,
} from "app/runtimeState";
import { updateAppRuntimeState, useAppRuntimeStore } from "app/store";

type EditorField = keyof DeviceClassEditorRuntimeState;

// Top-level fields a component can select. `dmxEditorTabSerializers` has its
// own helper.
type EditorValueField = Exclude<EditorField, "dmxEditorTabSerializers">;

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/** One field of an editor's runtime state. */
export function editorRuntimeField<K extends EditorField>(
  state: AppRuntimeState,
  documentId: EntityId | undefined,
  field: K,
): DeviceClassEditorRuntimeState[K] | undefined {
  return documentId === undefined
    ? undefined
    : state.deviceClassEditors[documentId]?.[field];
}

export function useEditorRuntimeField<K extends EditorValueField>(
  documentId: EntityId | undefined,
  field: K,
): DeviceClassEditorRuntimeState[K] | undefined {
  return useAppRuntimeStore((state) =>
    editorRuntimeField(state, documentId, field),
  );
}

/** The DMX serializer a DMX editor tab has selected. */
export function useEditorTabDmxSerializer(
  documentId: EntityId | undefined,
  tabId: string,
): EntityId | undefined {
  return useAppRuntimeStore(
    (state) =>
      editorRuntimeField(state, documentId, "dmxEditorTabSerializers")?.[tabId],
  );
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Changes an editor's runtime state. For use inside an updateAppRuntimeState
 * recipe that changes several editors at once.
 */
export function editorRuntimeDraft(
  state: AppRuntimeState,
  documentId: EntityId,
): DeviceClassEditorRuntimeState {
  return (state.deviceClassEditors[documentId] ??= {});
}

export function updateEditorRuntimeState(
  documentId: EntityId,
  recipe: (editor: DeviceClassEditorRuntimeState) => void,
) {
  updateAppRuntimeState((state) => {
    recipe(editorRuntimeDraft(state, documentId));
  });
}

/**
 * Drops the runtime state of every editor that is not represented in
 * openDocuments.
 */
export function forgetClosedEditors(openDocuments: Record<EntityId, unknown>) {
  const gone = editorIds(useAppRuntimeStore.getState()).filter(
    (documentId) => !(documentId in openDocuments),
  );
  if (gone.length === 0) {
    return;
  }

  updateAppRuntimeState((state) => {
    for (const documentId of gone) {
      delete state.deviceClassEditors[documentId];
    }
  });
}

// ---------------------------------------------------------------------------
// Subscribe
// ---------------------------------------------------------------------------

/**
 * Attaches a listener to a single field of the editor runtime state. It will
 * then be called whenever that field changes. An editor opening or closing
 * counts as a change only if the field had a value.
 */
export function subscribeToEditorRuntimeField(
  field: EditorValueField,
  listener: (documentIds: EntityId[]) => void,
): () => void {
  return useAppRuntimeStore.subscribe((state, previousState) => {
    if (state.deviceClassEditors === previousState.deviceClassEditors) {
      return;
    }

    const ids = new Set([...editorIds(state), ...editorIds(previousState)]);
    const changed = [...ids].filter(
      (id) =>
        editorRuntimeField(state, id, field) !==
        editorRuntimeField(previousState, id, field),
    );
    if (changed.length > 0) {
      listener(changed);
    }
  });
}

function editorIds(state: AppRuntimeState): EntityId[] {
  return Object.keys(state.deviceClassEditors) as EntityId[];
}

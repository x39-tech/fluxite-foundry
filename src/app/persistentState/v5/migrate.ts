import * as V4 from "../v4/state";
import * as V5 from "./state";

// v4 -> v5: one uniform notion of a document, and localizations that no longer
// carry their own back-references.
//
// In preparation for saving and loading documents, we create a generic
// `documents` map on the root state in place of `deviceClassEditors` and move
// data that should be persisted but not saved with a document into a new key
// `sessions`.
//
// The current selected editor becomes an EntityId instead of an index.
//
// `Localization.items` is dropped, as we now synthesize these back-references
// at runtime.

function migrateLocalizations(
  localizations: Record<string, V4.Localization>,
): Record<string, V5.Localization> {
  const migrated: Record<string, V5.Localization> = {};

  for (const [key, localization] of Object.entries(localizations)) {
    // Remove `items` and leave the new `exportKey` unset
    migrated[key] = { strings: localization.strings };
  }

  return migrated;
}

function migrateDocument(
  editor: V4.DeviceClassEditorState,
  sourceLocale: string,
): V5.DeviceClassDocument {
  const { windowLayout: _windowLayout, ...rest } = editor;

  return {
    ...rest,
    type: V5.documentTypes.DEVICE_CLASS,
    localizations: migrateLocalizations(editor.localizations),
    // The app had no per-document notion of an authoring locale before this,
    // so the one the user was working in is the best available answer.
    sourceLocale,
  } as V5.DeviceClassDocument;
}

/**
 * Migrates state from V4 to V5.
 *
 * Changes:
 * - `deviceClassEditors` becomes `documents`, a map of a union discriminated on
 *   `type`, with `type: "deviceClass"` stamped on each existing value.
 * - `openEditors` becomes `session`, which also takes over `windowLayout` from
 *   each document.
 * - The selected editor is identified by document id rather than by an index
 *   into the open-editors array.
 * - Each document gains `sourceLocale`, seeded from the app's locale setting.
 * - `Localization.items` is dropped, along with the item-type enum it held.
 */
export function migrateV4toV5(
  state: V4.AppPersistentState,
): V5.AppPersistentState {
  const documents: Record<string, V5.Document> = {};
  const layouts: Record<string, string> = {};

  for (const [id, editor] of Object.entries(state.deviceClassEditors)) {
    documents[id] = migrateDocument(editor, state.appSettings.locale);
    layouts[id] = editor.windowLayout;
  }

  // An open-editors entry naming a document that is not in the state was
  // already broken, and the new shape has no way to express it. Dropping it
  // here is what the old code did every time it looked the document up and
  // found nothing.
  const openDocuments = state.openEditors.editors
    .filter((editor) => documents[editor.id] !== undefined)
    .map((editor) => editor.id);

  const selected = state.openEditors.editors[state.openEditors.selectedEditor];
  const selectedDocumentId =
    selected && documents[selected.id] !== undefined ? selected.id : undefined;

  return {
    appSettings: state.appSettings,
    session: {
      openDocuments: openDocuments as V5.EntityId[],
      selectedDocumentId: selectedDocumentId as V5.EntityId | undefined,
      layouts: layouts as Record<V5.EntityId, string>,
    },
    documents: documents as Record<V5.EntityId, V5.Document>,
  };
}

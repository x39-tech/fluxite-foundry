import { writeFileSync } from "node:fs";
import { parseFluxiteCodexDocument, DeviceClass } from "@cpwg-community/delver";
import { getImportedDeviceClassEditor } from "../src/features/deviceClassEditor/import";
import { newEntityId } from "../src/app/stateUtils";
import {
  EntityType,
  getDefaultWindowLayout,
  OrgId,
  parseQualifiedId,
} from "../src/utils/utils";
import {
  AppPersistentState,
  AppStateSchema,
  getDefaultState,
  VERSION,
} from "../src/app/persistentState";
import { SNAPSHOT_FORMAT_VERSION } from "../src/app/stateSnapshot";
import encoreDocument from "../src/e173/examples/draft-2026-1/device-classes/martin_mac_encore_performance_cld.fcd?raw";
import movableDocument from "../src/e173/examples/draft-2026-1/device-classes/movable.fcd?raw";

/**
 * Captures the required file artifacts for this state version:
 *
 * - its snapshot, a filled out state for the migration integration tests
 * - its save file envelope, a minimal state used for importing a save file at
 *   this version.
 *
 * Run this when a state version is created, after the new state's shape is
 * settled, and commit the resulting files.
 */

// Relative to the repo root, since this only runs through the npm script.
const VERSION_DIR = `src/app/persistentState/v${VERSION}`;

const EXAMPLE_DOCUMENTS = [encoreDocument, movableDocument];

function deviceClassesInDocument(
  documentText: string,
): { orgId: OrgId; id: string; version: string; deviceClass: DeviceClass }[] {
  const parsed = parseFluxiteCodexDocument(documentText);
  if (parsed.errors.length > 0) {
    throw new Error(
      `Example document failed validation: ${JSON.stringify(parsed.errors)}`,
    );
  }

  return Object.entries(parsed.document.e173doc.deviceClasses ?? {}).flatMap(
    ([qualifiedId, versions]) => {
      const parsedId = parseQualifiedId(qualifiedId);
      if (!parsedId || parsedId[0] !== EntityType.Dev) {
        return [];
      }
      const [, orgId, id] = parsedId;
      return Object.entries(versions).map(([version, deviceClass]) => ({
        orgId,
        id,
        version,
        deviceClass,
      }));
    },
  );
}

function buildStateToCapture(): AppPersistentState {
  const state = getDefaultState();
  state.appSettings.orgId = { type: "org", id: "com.example" };

  for (const documentText of EXAMPLE_DOCUMENTS) {
    for (const { orgId, id, version, deviceClass } of deviceClassesInDocument(
      documentText,
    )) {
      const documentId = newEntityId();
      state.documents[documentId] = getImportedDeviceClassEditor(
        orgId,
        id,
        version,
        deviceClass,
        state.appSettings.locale,
      );
      state.session.openDocuments.push(documentId);
      state.session.layouts[documentId] = JSON.stringify(
        getDefaultWindowLayout(),
      );
    }
  }
  state.session.selectedDocumentId = state.session.openDocuments[0];

  return state;
}

/** The smallest state this version can hold a document in. */
function buildEnvelopeToCapture(): AppPersistentState {
  const state = getDefaultState();

  return {
    ...state,
    appSettings: {
      ...state.appSettings,
      orgId: { type: "org", id: "com.example" },
    },
    session: { openDocuments: [], selectedDocumentId: undefined, layouts: {} },
    documents: {},
  };
}

function validated(
  state: AppPersistentState,
  what: string,
): AppPersistentState {
  const result = AppStateSchema.safeParse(state);
  if (!result.success) {
    throw new Error(
      `Refusing to write a v${VERSION} ${what} that does not match the v${VERSION} schema: ${result.error.message}`,
    );
  }
  return state;
}

function write(path: string, contents: unknown) {
  writeFileSync(path, `${JSON.stringify(contents, null, 2)}\n`);
  console.log(`Wrote ${path}`);
}

write(`${VERSION_DIR}/snapshot.json`, {
  formatVersion: SNAPSHOT_FORMAT_VERSION,
  exportedAt: new Date().toISOString(),
  stateVersion: VERSION,
  state: validated(buildStateToCapture(), "snapshot"),
});

write(`${VERSION_DIR}/envelope.json`, {
  stateVersion: VERSION,
  state: validated(buildEnvelopeToCapture(), "envelope"),
});

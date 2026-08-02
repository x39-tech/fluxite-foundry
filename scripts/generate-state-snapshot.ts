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
 * Adds the current state version's snapshot to the snapshot history, by
 * importing the example device classes shipped with the E1.73 spec through the
 * app's own import path.
 */

// Relative to the repo root, since this only runs through the npm script.
const HISTORY_DIR = "src/app/persistentState/testdata";

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

const state = buildStateToCapture();

const validation = AppStateSchema.safeParse(state);
if (!validation.success) {
  throw new Error(
    `Refusing to write a v${VERSION} snapshot that does not match the v${VERSION} schema: ${validation.error.message}`,
  );
}

const path = `${HISTORY_DIR}/v${VERSION}.json`;
writeFileSync(
  path,
  `${JSON.stringify(
    {
      formatVersion: SNAPSHOT_FORMAT_VERSION,
      exportedAt: new Date().toISOString(),
      stateVersion: VERSION,
      state,
    },
    null,
    2,
  )}\n`,
);
console.log(`Wrote ${path}`);

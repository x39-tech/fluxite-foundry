import { describe, expect, test, beforeEach } from "vitest";
import { createEmptyDeviceClassEditor, resetAllStores } from "test/utils";
import { EntityId, VERSION } from "./persistentState";
import { getSchemaForVersion } from "./persistentStateMigrations";
import { useAppPersistentStore } from "./store";
import {
  DOCUMENT_ENVELOPES,
  ENVELOPED_DOCUMENT_ID,
  envelopeForVersion,
  MIN_SAVE_FILE_STATE_VERSION,
} from "./documentFileEnvelopes";

// Every version a save file can hold, the current one included.
const versionsNeedingEnvelopes = Array.from(
  { length: VERSION - MIN_SAVE_FILE_STATE_VERSION + 1 },
  (_, index) => MIN_SAVE_FILE_STATE_VERSION + index,
);

describe("document envelopes", () => {
  beforeEach(() => {
    resetAllStores();
  });

  test.each(versionsNeedingEnvelopes)(
    "v%i has a captured envelope",
    (version) => {
      expect(
        DOCUMENT_ENVELOPES[version],
        `Run 'npm run state-version:capture' from a build where v${version} is current.`,
      ).toBeDefined();
    },
  );

  describe.each(Object.keys(DOCUMENT_ENVELOPES).map(Number))(
    "the captured v%i envelope",
    (version) => {
      test("is a state its own version accepts", () => {
        const result = getSchemaForVersion(version)?.safeParse(
          envelopeForVersion(version)?.(undefined),
        );

        // The document is the one thing that will not parse, since there is
        // none here to put in.
        const problems = (result?.error?.issues ?? []).filter(
          (issue) => issue.path[0] !== "documents",
        );
        expect(problems).toEqual([]);
      });

      test("holds the document it is given", () => {
        const document = { type: "deviceClass" };

        const enveloped = envelopeForVersion(version)?.(document) as {
          documents: Record<string, unknown>;
        };

        expect(enveloped.documents[ENVELOPED_DOCUMENT_ID]).toBe(document);
      });
    },
  );

  test("the current version's envelope takes a whole document", () => {
    createEmptyDeviceClassEditor();
    const document =
      useAppPersistentStore.getState().documents[EntityId("test-editor-id")];

    const enveloped = envelopeForVersion(VERSION)?.(document);

    expect(getSchemaForVersion(VERSION)?.safeParse(enveloped)).toMatchObject({
      success: true,
    });
  });

  test("has no envelope for a version that does not exist", () => {
    expect(envelopeForVersion(VERSION + 1)).toBeUndefined();
  });
});

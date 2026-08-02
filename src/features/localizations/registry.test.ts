import { describe, expect, test } from "vitest";
import {
  EntityId,
  Localization,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import {
  buildLocalizationIndex,
  checkIntegrity,
  collectOrphans,
  createLocalizedFields,
  localizationProblems,
  removeLocalizationsFor,
  setLocalizedValue,
} from "./registry";
import { LocalizationRegistry } from "./types";

// Intentionally simplified document types for testing

interface Widget {
  name: string;
  localized: {
    label: LocalizationKey;
    note?: LocalizationKey;
  };
}

interface Banner {
  localized: {
    title: LocalizationKey;
  };
}

interface TestDocument {
  localizations: Record<LocalizationKey, Localization>;
  banner: Banner;
  widgets: Record<EntityId, Widget>;
  // Carries no localized fields, so the registry must not mention it.
  colours: Record<EntityId, { hex: string }>;
}

const REGISTRY: LocalizationRegistry<TestDocument> = {
  banner: {
    kind: "singleton",
    label: "Banner",
    fields: {
      title: {
        label: "Title",
        required: true,
        makeKey: () => "banner_title",
      },
    },
  },
  widgets: {
    kind: "table",
    label: "Widget",
    fields: {
      label: {
        label: "Label",
        required: true,
        makeKey: ({ entity }) => `widget_${entity.name}_label`,
      },
      note: {
        label: "Note",
        // A note can only be keyed by a widget the document knows about.
        makeKey: ({ document, entityId }) =>
          entityId && document.widgets[entityId]
            ? `widget_${document.widgets[entityId].name}_note`
            : undefined,
      },
    },
  },
};

const WIDGET_ONE = EntityId("widget-1");
const WIDGET_TWO = EntityId("widget-2");

function localization(strings: Record<string, string>): Localization {
  return { strings: LocalizationDbSchema.parse(strings) };
}

function createDocument(): TestDocument {
  return {
    localizations: {
      [LocalizationKey("banner_title")]: localization({ "en-US": "Welcome" }),
      [LocalizationKey("widget_one_label")]: localization({ "en-US": "One" }),
      [LocalizationKey("widget_two_label")]: localization({ "en-US": "Two" }),
      [LocalizationKey("shared_note")]: localization({ "en-US": "Shared" }),
      [LocalizationKey("unused")]: localization({ "en-US": "Nothing uses me" }),
    },
    banner: { localized: { title: LocalizationKey("banner_title") } },
    widgets: {
      [WIDGET_ONE]: {
        name: "one",
        localized: {
          label: LocalizationKey("widget_one_label"),
          note: LocalizationKey("shared_note"),
        },
      },
      [WIDGET_TWO]: {
        name: "two",
        localized: {
          label: LocalizationKey("widget_two_label"),
          note: LocalizationKey("shared_note"),
        },
      },
    },
    colours: { [EntityId("red")]: { hex: "#f00" } },
  };
}

// Optional tables must resolve the same as required ones, although we do not
// typically use them.
interface DocumentWithOptionalTable {
  localizations: Record<LocalizationKey, Localization>;
  widgets?: Record<EntityId, Widget>;
}

const OPTIONAL_TABLE_REGISTRY: LocalizationRegistry<DocumentWithOptionalTable> =
  {
    widgets: {
      kind: "table",
      label: "Widget",
      fields: {
        label: {
          label: "Label",
          required: true,
          makeKey: ({ entity }) => `widget_${entity.name}_label`,
        },
        note: {
          label: "Note",
          makeKey: ({ entity }) => `widget_${entity.name}_note`,
        },
      },
    },
  };

describe("an optional table", () => {
  test("is walked when the document has it", () => {
    const document: DocumentWithOptionalTable = {
      localizations: {
        [LocalizationKey("widget_one_label")]: localization({ "en-US": "One" }),
      },
      widgets: {
        [WIDGET_ONE]: {
          name: "one",
          localized: { label: LocalizationKey("widget_one_label") },
        },
      },
    };

    const index = buildLocalizationIndex(document, OPTIONAL_TABLE_REGISTRY);

    expect(index[LocalizationKey("widget_one_label")]).toEqual([
      { table: "widgets", entityId: WIDGET_ONE, field: "label" },
    ]);
    expect(checkIntegrity(document, OPTIONAL_TABLE_REGISTRY)).toEqual([]);
  });

  test("leaves its strings unreferenced when the document does not", () => {
    const document: DocumentWithOptionalTable = {
      localizations: {
        [LocalizationKey("widget_one_label")]: localization({ "en-US": "One" }),
      },
    };

    expect(buildLocalizationIndex(document, OPTIONAL_TABLE_REGISTRY)).toEqual(
      {},
    );
    expect(collectOrphans(document, OPTIONAL_TABLE_REGISTRY)).toEqual([
      LocalizationKey("widget_one_label"),
    ]);
    expect(checkIntegrity(document, OPTIONAL_TABLE_REGISTRY)).toEqual([]);
  });
});

describe("buildLocalizationIndex", () => {
  test("finds what refers to each string", () => {
    const index = buildLocalizationIndex(createDocument(), REGISTRY);

    expect(index[LocalizationKey("banner_title")]).toEqual([
      { table: "banner", entityId: undefined, field: "title" },
    ]);
    expect(index[LocalizationKey("widget_one_label")]).toEqual([
      { table: "widgets", entityId: WIDGET_ONE, field: "label" },
    ]);
  });

  test("collects every reference to a shared string", () => {
    const index = buildLocalizationIndex(createDocument(), REGISTRY);

    expect(index[LocalizationKey("shared_note")]).toEqual([
      { table: "widgets", entityId: WIDGET_ONE, field: "note" },
      { table: "widgets", entityId: WIDGET_TWO, field: "note" },
    ]);
  });

  test("has no entry for a string nothing refers to", () => {
    const index = buildLocalizationIndex(createDocument(), REGISTRY);

    expect(index[LocalizationKey("unused")]).toBeUndefined();
  });
});

describe("collectOrphans", () => {
  test("returns the strings nothing refers to", () => {
    expect(collectOrphans(createDocument(), REGISTRY)).toEqual([
      LocalizationKey("unused"),
    ]);
  });

  test("returns a string that loses its last reference", () => {
    const document = createDocument();
    delete document.widgets[WIDGET_ONE];
    delete document.widgets[WIDGET_TWO];

    expect(collectOrphans(document, REGISTRY)).toEqual([
      LocalizationKey("widget_one_label"),
      LocalizationKey("widget_two_label"),
      LocalizationKey("shared_note"),
      LocalizationKey("unused"),
    ]);
  });
});

describe("createLocalizedFields", () => {
  test("creates a string for each field that has a value", () => {
    const document = createDocument();
    const widgetId = EntityId("widget-3");

    const localized = createLocalizedFields(
      document,
      REGISTRY,
      "widgets",
      widgetId,
      { name: "three" },
      { label: "Three", note: "A note" },
      "en-US",
    );

    expect(localized.label).toBe(LocalizationKey("widget_three_label"));
    expect(document.localizations[localized.label].strings["en-US"]).toBe(
      "Three",
    );
    expect(localized.note).toBeUndefined();
  });

  test("skips an optional field with no value", () => {
    const document = createDocument();

    const localized = createLocalizedFields(
      document,
      REGISTRY,
      "widgets",
      EntityId("widget-3"),
      { name: "three" },
      { label: "Three", note: "" },
      "en-US",
    );

    expect(localized.note).toBeUndefined();
    expect(
      document.localizations[LocalizationKey("widget_three_note")],
    ).toBeUndefined();
  });

  test("still creates a required field with no value", () => {
    const document = createDocument();

    const localized = createLocalizedFields(
      document,
      REGISTRY,
      "widgets",
      EntityId("widget-3"),
      { name: "three" },
      { label: "", note: undefined },
      "en-US",
    );

    expect(document.localizations[localized.label].strings["en-US"]).toBe("");
  });

  test("does not reuse a key the document already has", () => {
    const document = createDocument();

    const localized = createLocalizedFields(
      document,
      REGISTRY,
      "widgets",
      EntityId("widget-3"),
      { name: "one" },
      { label: "Another one", note: undefined },
      "en-US",
    );

    expect(localized.label).not.toBe(LocalizationKey("widget_one_label"));
    expect(
      document.localizations[LocalizationKey("widget_one_label")].strings[
        "en-US"
      ],
    ).toBe("One");
  });
});

describe("setLocalizedValue", () => {
  test("updates the string a field already has", () => {
    const document = createDocument();

    setLocalizedValue(
      document,
      REGISTRY,
      { table: "widgets", entityId: WIDGET_ONE, field: "label" },
      "Renamed",
      "en-US",
    );

    expect(
      document.localizations[LocalizationKey("widget_one_label")].strings[
        "en-US"
      ],
    ).toBe("Renamed");
  });

  test("writes into the given locale only", () => {
    const document = createDocument();

    setLocalizedValue(
      document,
      REGISTRY,
      { table: "widgets", entityId: WIDGET_ONE, field: "label" },
      "Un",
      "fr-FR",
    );

    const strings =
      document.localizations[LocalizationKey("widget_one_label")].strings;
    expect(strings).toEqual({ "en-US": "One", "fr-FR": "Un" });
  });

  test("creates a string for a field that has none", () => {
    const document = createDocument();
    delete document.widgets[WIDGET_ONE].localized.note;

    setLocalizedValue(
      document,
      REGISTRY,
      { table: "widgets", entityId: WIDGET_ONE, field: "note" },
      "A note",
      "en-US",
    );

    const key = document.widgets[WIDGET_ONE].localized.note;
    expect(key).toBe(LocalizationKey("widget_one_note"));
    expect(document.localizations[key!].strings["en-US"]).toBe("A note");
  });

  test("sets a singleton's field", () => {
    const document = createDocument();

    setLocalizedValue(
      document,
      REGISTRY,
      { table: "banner", field: "title" },
      "Hello",
      "en-US",
    );

    expect(
      document.localizations[LocalizationKey("banner_title")].strings["en-US"],
    ).toBe("Hello");
  });

  test("releases the string when an optional field is blanked", () => {
    const document = createDocument();
    delete document.widgets[WIDGET_TWO];

    setLocalizedValue(
      document,
      REGISTRY,
      { table: "widgets", entityId: WIDGET_ONE, field: "note" },
      "",
      "en-US",
    );

    expect(document.widgets[WIDGET_ONE].localized.note).toBeUndefined();
    expect(
      document.localizations[LocalizationKey("shared_note")],
    ).toBeUndefined();
  });

  test("keeps a released string that something else still refers to", () => {
    const document = createDocument();

    setLocalizedValue(
      document,
      REGISTRY,
      { table: "widgets", entityId: WIDGET_ONE, field: "note" },
      "",
      "en-US",
    );

    expect(document.widgets[WIDGET_ONE].localized.note).toBeUndefined();
    expect(
      document.localizations[LocalizationKey("shared_note")],
    ).toBeDefined();
  });

  test("keeps the string when a required field is blanked", () => {
    const document = createDocument();

    setLocalizedValue(
      document,
      REGISTRY,
      { table: "widgets", entityId: WIDGET_ONE, field: "label" },
      "",
      "en-US",
    );

    expect(document.widgets[WIDGET_ONE].localized.label).toBe(
      LocalizationKey("widget_one_label"),
    );
    expect(
      document.localizations[LocalizationKey("widget_one_label")].strings[
        "en-US"
      ],
    ).toBe("");
  });

  test("does nothing for an entity the document does not have", () => {
    const document = createDocument();
    const before = structuredClone(document);

    setLocalizedValue(
      document,
      REGISTRY,
      { table: "widgets", entityId: EntityId("missing"), field: "label" },
      "Whatever",
      "en-US",
    );

    expect(document).toEqual(before);
  });
});

describe("removeLocalizationsFor", () => {
  test("deletes the strings only the removed entity referred to", () => {
    const document = createDocument();

    removeLocalizationsFor(document, REGISTRY, [
      { table: "widgets", entityId: WIDGET_ONE },
    ]);

    expect(
      document.localizations[LocalizationKey("widget_one_label")],
    ).toBeUndefined();
    expect(
      document.localizations[LocalizationKey("shared_note")],
    ).toBeDefined();
  });

  test("deletes a shared string once every referrer is removed", () => {
    const document = createDocument();

    removeLocalizationsFor(document, REGISTRY, [
      { table: "widgets", entityId: WIDGET_ONE },
      { table: "widgets", entityId: WIDGET_TWO },
    ]);

    expect(
      document.localizations[LocalizationKey("shared_note")],
    ).toBeUndefined();
  });

  test("leaves strings nothing removed referred to alone", () => {
    const document = createDocument();

    removeLocalizationsFor(document, REGISTRY, [
      { table: "widgets", entityId: WIDGET_ONE },
    ]);

    expect(
      document.localizations[LocalizationKey("banner_title")],
    ).toBeDefined();
    expect(document.localizations[LocalizationKey("unused")]).toBeDefined();
  });
});

describe("checkIntegrity", () => {
  test("passes a consistent document", () => {
    expect(checkIntegrity(createDocument(), REGISTRY)).toEqual([]);
  });

  test("reports a field pointing at a string the document does not have", () => {
    const document = createDocument();
    delete document.localizations[LocalizationKey("widget_one_label")];

    const problems = checkIntegrity(document, REGISTRY);

    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toBe(localizationProblems.MISSING);
    expect(problems[0].key).toBe(LocalizationKey("widget_one_label"));
    expect(problems[0].reference).toEqual({
      table: "widgets",
      entityId: WIDGET_ONE,
      field: "label",
    });
  });

  test("reports a string with no value in any locale", () => {
    const document = createDocument();
    document.localizations[LocalizationKey("widget_one_label")] = localization(
      {},
    );

    const problems = checkIntegrity(document, REGISTRY);

    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toBe(localizationProblems.EMPTY);
    expect(problems[0].key).toBe(LocalizationKey("widget_one_label"));
  });

  test("does not report an orphan, which is a normal state", () => {
    const document = createDocument();

    expect(checkIntegrity(document, REGISTRY)).toEqual([]);
    expect(collectOrphans(document, REGISTRY)).toContain(
      LocalizationKey("unused"),
    );
  });

  test("reports a required field that holds no key at all", () => {
    const document = createDocument();
    // Only reachable by a cast: the entity type says the key is mandatory,
    // which is the invariant this check exists to defend.
    delete (document.widgets[WIDGET_ONE].localized as { label?: unknown })
      .label;

    const problems = checkIntegrity(document, REGISTRY);

    expect(problems).toHaveLength(1);
    expect(problems[0].problem).toBe(localizationProblems.UNKEYED);
    expect(problems[0].key).toBeUndefined();
    expect(problems[0].reference).toEqual({
      table: "widgets",
      entityId: WIDGET_ONE,
      field: "label",
    });
  });

  test("does not report an optional field that holds no key", () => {
    const document = createDocument();
    delete document.widgets[WIDGET_ONE].localized.note;

    expect(checkIntegrity(document, REGISTRY)).toEqual([]);
  });
});

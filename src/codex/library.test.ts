import { describe, expect, it } from "vitest";
import { Library as FCLibrary } from "@cpwg-community/delver";
import { CodexId, LocalizationKey } from "app/persistentState";
import { normalizeLibrary } from "./library";

const testLibrary: FCLibrary = {
  "@description": "test_lib_desc",
  publishDate: "2026-01-01",
  author: "Test Author",
  parameterClasses: {
    "intensity/dimmer": {
      "@name": "dimmer_name",
      "@description": "dimmer_desc",
      dataType: "number",
      unit: { name: "ratio" as const },
    },
    mode: {
      "@name": "mode_name",
      dataType: "enum",
      choices: [
        { id: "auto", "@name": "auto_name" },
        { id: "manual", "@name": "manual_name" },
      ],
    },
  },
  resourceClasses: {
    icon: { "@name": "icon_name", mediaType: ["image/png"] },
  },
  commandClasses: {
    reset: {
      "@name": "reset_name",
      arguments: {
        // Deliberately shares a codexId with a return value below.
        target: {
          "@name": "arg_target_name",
          dataType: "enum",
          required: true,
          choices: [{ id: "all", "@name": "all_name" }],
        },
      },
      returns: {
        target: {
          "@name": "ret_target_name",
          dataType: "string",
          required: false,
        },
      },
    },
  },
  localizations: {
    "en-US": {
      strings: {
        test_lib_desc: "Test Library",
        dimmer_name: "Dimmer",
        dimmer_desc: "The dimmer",
        mode_name: "Mode",
        auto_name: "Auto",
      },
    },
    "fr-FR": {
      strings: {
        dimmer_name: "Gradateur",
      },
    },
  },
};

describe("normalizeLibrary", () => {
  const normalized = normalizeLibrary(
    "org.test.lib.test",
    "1.0.0",
    testLibrary,
  );
  const { library, index } = normalized;

  it("keeps the library's identity and description key", () => {
    expect(normalized.id).toBe("org.test.lib.test");
    expect(normalized.version).toBe("1.0.0");
    expect(normalized.descriptionKey).toBe("test_lib_desc");
  });

  it("inverts locale-first localizations into a key-first table", () => {
    expect(
      library.localizations[LocalizationKey("dimmer_name")].strings,
    ).toEqual({
      "en-US": "Dimmer",
      "fr-FR": "Gradateur",
    });
  });

  it("flattens parameter classes into a table keyed by EntityId", () => {
    const classId = index.parameterClasses.get(CodexId("intensity/dimmer"));
    expect(classId).toBeDefined();

    expect(library.parameterClasses[classId!]).toEqual({
      codexId: "intensity/dimmer",
      dataType: "number",
      unit: { name: "ratio" as const },
      localized: { name: "dimmer_name", description: "dimmer_desc" },
    });
  });

  it("flattens enum choices out of their owning class, keeping their order", () => {
    const classId = index.parameterClasses.get(CodexId("mode"))!;
    const choiceIds = index.enumChoices.get(classId)!;

    const auto = library.enumChoices[choiceIds.get(CodexId("auto"))!];
    const manual = library.enumChoices[choiceIds.get(CodexId("manual"))!];

    expect(auto.index).toBe(0);
    expect(auto.parent).toEqual({ type: "paramClass", id: classId });
    expect(manual.index).toBe(1);
  });

  it("indexes resource classes", () => {
    const classId = index.resourceClasses.get(CodexId("icon"))!;
    expect(library.resourceClasses[classId].mediaType).toEqual(["image/png"]);
  });

  it("indexes command arguments and return values separately", () => {
    const classId = index.commandClasses.get(CodexId("reset"))!;
    const argId = index.commandArguments.get(classId)!.get(CodexId("target"))!;
    const retId = index.commandReturnValues
      .get(classId)!
      .get(CodexId("target"))!;

    expect(argId).not.toBe(retId);
    expect(library.commandClassArguments[argId]).toMatchObject({
      parentId: classId,
      codexId: "target",
      dataType: "enum",
      required: true,
      localized: { name: "arg_target_name" },
    });
    expect(library.commandClassReturnValues[retId]).toMatchObject({
      parentId: classId,
      codexId: "target",
      dataType: "string",
      required: false,
      localized: { name: "ret_target_name" },
    });
  });

  it("indexes the enum choices of a command argument under the argument", () => {
    const classId = index.commandClasses.get(CodexId("reset"))!;
    const argId = index.commandArguments.get(classId)!.get(CodexId("target"))!;
    const choiceId = index.enumChoices.get(argId)!.get(CodexId("all"))!;

    expect(library.enumChoices[choiceId].parent).toEqual({
      type: "cmdClassArg",
      id: argId,
    });
  });

  it("mints distinct ids on each normalization", () => {
    const other = normalizeLibrary("org.test.lib.test", "1.0.0", testLibrary);
    expect(other.index.parameterClasses.get(CodexId("mode"))).not.toBe(
      index.parameterClasses.get(CodexId("mode")),
    );
  });
});

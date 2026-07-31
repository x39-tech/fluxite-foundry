import { describe, expect, it } from "vitest";
import { Library as FCLibrary } from "@cpwg-community/delver";
import { CodexId, EntityId, LocalizationKey } from "app/persistentState";
import {
  emptyLibrary,
  Library,
  LibraryStore,
  normalizeLibrary,
} from "codex/library";
import { resolveClassRef, resolveMemberId } from "./classResolution";

const LIB_ID = "org.test.lib.test";

const fcLibrary: FCLibrary = {
  "@description": "test_lib_desc",
  publishDate: "2026-01-01",
  author: "Test Author",
  parameterClasses: {
    mode: {
      "@name": "mode_name",
      dataType: "enum",
      choices: [{ id: "auto", "@name": "auto_name" }],
    },
  },
  commandClasses: {
    reset: {
      "@name": "reset_name",
      arguments: {
        target: { "@name": "target_name", dataType: "string", required: true },
      },
    },
  },
  localizations: {},
};

const store: LibraryStore = {
  [LIB_ID]: { "1.0.0": normalizeLibrary(LIB_ID, "1.0.0", fcLibrary) },
};

const LOCAL_CLASS_ID = EntityId("local-param-class");

function localEditor(
  pinnedVersion?: string,
): Library & { libraries: Record<string, string> } {
  return {
    ...emptyLibrary(),
    libraries: pinnedVersion ? { [LIB_ID]: pinnedVersion } : {},
    parameterClasses: {
      [LOCAL_CLASS_ID]: {
        codexId: CodexId("local-mode"),
        dataType: "enum",
        localized: { name: LocalizationKey("local_mode_name") },
      },
    },
  };
}

describe("resolveClassRef", () => {
  it("resolves a local reference to the editor's own tables", () => {
    const editor = localEditor("1.0.0");
    const resolved = resolveClassRef(
      { type: "local", id: LOCAL_CLASS_ID },
      editor.libraries,
      editor,
      store,
      "parameterClasses",
    );

    expect(resolved).toEqual({ library: editor, classId: LOCAL_CLASS_ID });
    expect(resolved?.index).toBeUndefined();
  });

  it("resolves an imported reference through the pinned library version", () => {
    const editor = localEditor("1.0.0");
    const resolved = resolveClassRef(
      { type: "imported", library: LIB_ID, codexId: CodexId("mode") },
      editor.libraries,
      editor,
      store,
      "parameterClasses",
    );

    const imported = store[LIB_ID]["1.0.0"];
    expect(resolved?.library).toBe(imported.library);
    expect(resolved?.index).toBe(imported.index);
    expect(resolved?.classId).toBe(
      imported.index.parameterClasses.get(CodexId("mode")),
    );
  });

  it("returns undefined when the device class pins no version of the library", () => {
    const editor = localEditor();
    expect(
      resolveClassRef(
        { type: "imported", library: LIB_ID, codexId: CodexId("mode") },
        editor.libraries,
        editor,
        store,
        "parameterClasses",
      ),
    ).toBeUndefined();
  });

  it("returns undefined when the pinned version is not loaded", () => {
    const editor = localEditor("2.0.0");
    expect(
      resolveClassRef(
        { type: "imported", library: LIB_ID, codexId: CodexId("mode") },
        editor.libraries,
        editor,
        store,
        "parameterClasses",
      ),
    ).toBeUndefined();
  });

  it("returns undefined when the library has no such class", () => {
    const editor = localEditor("1.0.0");
    expect(
      resolveClassRef(
        { type: "imported", library: LIB_ID, codexId: CodexId("nonexistent") },
        editor.libraries,
        editor,
        store,
        "parameterClasses",
      ),
    ).toBeUndefined();
  });
});

describe("resolveMemberId", () => {
  const editor = localEditor("1.0.0");

  it("maps an imported member codexId onto the library's EntityId", () => {
    const resolved = resolveClassRef(
      { type: "imported", library: LIB_ID, codexId: CodexId("reset") },
      editor.libraries,
      editor,
      store,
      "commandClasses",
    )!;

    const argId = resolveMemberId(
      resolved,
      "commandArguments",
      resolved.classId,
      CodexId("target"),
    );

    expect(argId).toBeDefined();
    expect(resolved.library.commandClassArguments[argId!].codexId).toBe(
      "target",
    );
  });

  it("returns undefined for a member the imported class does not have", () => {
    const resolved = resolveClassRef(
      { type: "imported", library: LIB_ID, codexId: CodexId("reset") },
      editor.libraries,
      editor,
      store,
      "commandClasses",
    )!;

    expect(
      resolveMemberId(
        resolved,
        "commandArguments",
        resolved.classId,
        CodexId("nonexistent"),
      ),
    ).toBeUndefined();
  });

  it("passes a local member id through unchanged", () => {
    const resolved = resolveClassRef(
      { type: "local", id: LOCAL_CLASS_ID },
      editor.libraries,
      editor,
      store,
      "parameterClasses",
    )!;

    expect(
      resolveMemberId(
        resolved,
        "enumChoices",
        LOCAL_CLASS_ID,
        EntityId("some-choice"),
      ),
    ).toBe("some-choice");
  });
});

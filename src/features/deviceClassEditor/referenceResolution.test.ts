import { describe, test, expect } from "vitest";
import {
  ClassReference,
  CodexId,
  Command,
  CommandArgument,
  CommandReturnValue,
  EntityId,
  EnumChoice,
  EnumChoiceParent,
  Parameter,
} from "app/persistentState";
import {
  classMemberId,
  classReferenceCodexId,
  commandArgKeyToCodex,
  commandArgKeyToEditor,
  commandCurrentCodexId,
  commandExclusionsToCodex,
  commandExclusionsToEditor,
  parameterCurrentCodexId,
  paramExclusionsToCodex,
  paramExclusionsToEditor,
  resolveCommandId,
  toEditorParameterReference,
} from "./referenceResolution";

// The resolvers only read a couple of fields off each entity, so the factories
// below build just those fields and cast to the full entity type. A single
// coherent editor describes one local parameter class, one local command
// class, and their enum choices; imported cases pass a matching imported
// ClassReference and rely on passthrough rather than any lookup.

function paramTable(
  codexIdsById: Record<string, string>,
): Record<string, Parameter> {
  const table: Record<string, Parameter> = {};
  for (const [id, codexId] of Object.entries(codexIdsById)) {
    table[id] = { codexId: CodexId(codexId) } as Parameter;
  }
  return table;
}

function commandTable(
  codexIdsById: Record<string, string>,
): Record<string, Command> {
  const table: Record<string, Command> = {};
  for (const [id, codexId] of Object.entries(codexIdsById)) {
    table[id] = { codexId: CodexId(codexId) } as Command;
  }
  return table;
}

function memberTable<T extends CommandArgument | CommandReturnValue>(
  members: { id: string; codexId: string; parentId: string }[],
): Record<string, T> {
  const table: Record<string, T> = {};
  for (const { id, codexId, parentId } of members) {
    table[id] = {
      codexId: CodexId(codexId),
      parentId: EntityId(parentId),
    } as T;
  }
  return table;
}

function choice(
  id: string,
  codexId: string,
  parent: EnumChoiceParent,
): [string, EnumChoice] {
  return [id, { codexId: CodexId(codexId), parent } as EnumChoice];
}

// A local parameter class "pc1" with two enum choices, and a local command
// class "cc1" with a "mode" argument (two choices) and a "status" return value
// (one choice).
const editor = {
  parameters: paramTable({ p1: "gain" }),
  commands: commandTable({ cmd1: "reset" }),
  commandClassArguments: memberTable<CommandArgument>([
    { id: "ca_mode", codexId: "mode", parentId: "cc1" },
    { id: "ca_speed", codexId: "speed", parentId: "cc1" },
  ]),
  commandClassReturnValues: memberTable<CommandReturnValue>([
    { id: "cr_status", codexId: "status", parentId: "cc1" },
  ]),
  enumChoices: Object.fromEntries([
    choice("ec_red", "red", { type: "paramClass", id: EntityId("pc1") }),
    choice("ec_green", "green", { type: "paramClass", id: EntityId("pc1") }),
    choice("ace_on", "on", { type: "cmdClassArg", id: EntityId("ca_mode") }),
    choice("ace_off", "off", { type: "cmdClassArg", id: EntityId("ca_mode") }),
    choice("rce_ok", "ok", { type: "cmdClassRet", id: EntityId("cr_status") }),
  ]),
};

const localParamClass: ClassReference = {
  type: "local",
  id: EntityId("pc1"),
};
const importedParamClass: ClassReference = {
  type: "imported",
  library: "lib",
  codexId: CodexId("colorMode"),
};
const localCmdClass: ClassReference = {
  type: "local",
  id: EntityId("cc1"),
};
const importedCmdClass: ClassReference = {
  type: "imported",
  library: "lib",
  codexId: CodexId("setColor"),
};

// ---------------------------------------------------------------------------

describe("parameter references", () => {
  test("resolves a known codexId to its entity id", () => {
    expect(toEditorParameterReference(editor, CodexId("gain"))).toEqual({
      id: "p1",
    });
  });

  test("preserves the index when present", () => {
    expect(toEditorParameterReference(editor, CodexId("gain"), 2)).toEqual({
      id: "p1",
      index: 2,
    });
  });

  test("omits the index when not given", () => {
    expect("index" in toEditorParameterReference(editor, CodexId("gain"))).toBe(
      false,
    );
  });

  test("unresolvable codexId becomes a synthetic missing id", () => {
    expect(toEditorParameterReference(editor, CodexId("nope")).id).toMatch(
      /^missing-nope-/,
    );
  });

  test("first writer wins for duplicate codexIds", () => {
    const dupEditor = { parameters: paramTable({ a: "gain", b: "gain" }) };
    expect(toEditorParameterReference(dupEditor, CodexId("gain")).id).toBe("a");
  });

  test("currentCodexId round-trips a resolvable reference", () => {
    expect(parameterCurrentCodexId(editor, { id: EntityId("p1") })).toBe(
      "gain",
    );
  });

  test("currentCodexId surfaces the raw id when unresolvable", () => {
    expect(
      parameterCurrentCodexId(editor, { id: EntityId("missing-gain-xyz") }),
    ).toBe("missing-gain-xyz");
  });
});

describe("command references", () => {
  test("resolves and reverses a known command", () => {
    const id = resolveCommandId(editor, CodexId("reset"));
    expect(id).toBe("cmd1");
    expect(commandCurrentCodexId(editor, id)).toBe("reset");
  });

  test("unresolvable command becomes a synthetic missing id", () => {
    expect(resolveCommandId(editor, CodexId("nope"))).toMatch(/^missing-nope-/);
  });
});

describe("parameter enum exclusions", () => {
  test("local class round-trips codexIds through entity ids", () => {
    const stored = paramExclusionsToEditor(editor, localParamClass, [
      CodexId("red"),
      CodexId("green"),
    ]);
    expect(stored).toEqual(["ec_red", "ec_green"]);
    expect(paramExclusionsToCodex(editor, localParamClass, stored)).toEqual([
      "red",
      "green",
    ]);
  });

  test("imported class passes ids through unchanged", () => {
    const stored = paramExclusionsToEditor(editor, importedParamClass, [
      CodexId("red"),
    ]);
    expect(stored).toEqual(["red"]);
    expect(paramExclusionsToCodex(editor, importedParamClass, stored)).toEqual([
      "red",
    ]);
  });

  test("unresolvable local exclusion becomes a synthetic missing id", () => {
    const [stored] = paramExclusionsToEditor(editor, localParamClass, [
      CodexId("blue"),
    ]);
    expect(stored).toMatch(/^missing-blue-/);
  });
});

describe("command enum exclusions", () => {
  test("local arguments round-trip both member keys and choices", () => {
    const stored = commandExclusionsToEditor(editor, localCmdClass, "arg", {
      mode: [CodexId("on"), CodexId("off")],
    });
    expect(stored).toEqual({ ca_mode: ["ace_on", "ace_off"] });
    expect(
      commandExclusionsToCodex(editor, localCmdClass, "arg", stored),
    ).toEqual({ mode: ["on", "off"] });
  });

  test("kind selects the return-value table", () => {
    const stored = commandExclusionsToEditor(editor, localCmdClass, "return", {
      status: [CodexId("ok")],
    });
    expect(stored).toEqual({ cr_status: ["rce_ok"] });
    expect(
      commandExclusionsToCodex(editor, localCmdClass, "return", stored),
    ).toEqual({ status: ["ok"] });
  });

  test("imported class passes keys and choices through unchanged", () => {
    const stored = commandExclusionsToEditor(editor, importedCmdClass, "arg", {
      mode: [CodexId("on")],
    });
    expect(stored).toEqual({ mode: ["on"] });
    expect(
      commandExclusionsToCodex(editor, importedCmdClass, "arg", stored),
    ).toEqual({ mode: ["on"] });
  });
});

describe("command argument condition keys", () => {
  test("local class round-trips an argument key", () => {
    const stored = commandArgKeyToEditor(
      editor,
      localCmdClass,
      CodexId("mode"),
    );
    expect(stored).toBe("ca_mode");
    expect(commandArgKeyToCodex(editor, localCmdClass, stored)).toBe("mode");
  });

  test("imported class passes the key through unchanged", () => {
    const stored = commandArgKeyToEditor(
      editor,
      importedCmdClass,
      CodexId("mode"),
    );
    expect(stored).toBe("mode");
    expect(commandArgKeyToCodex(editor, importedCmdClass, stored)).toBe("mode");
  });
});

describe("classMemberId", () => {
  test("prefers the local entity id when present", () => {
    expect(classMemberId(EntityId("ec_red"), CodexId("red"))).toBe("ec_red");
  });

  test("falls back to the codexId for imported members", () => {
    expect(classMemberId(undefined, CodexId("red"))).toBe("red");
  });
});

describe("classReferenceCodexId", () => {
  // The class table maps class EntityId -> the class entity's current codexId.
  const classTable = { pc1: { codexId: CodexId("gain") } };

  test("resolves a local class to its current codexId", () => {
    expect(classReferenceCodexId(localParamClass, classTable)).toBe("gain");
  });

  test("reflects a renamed local class", () => {
    const renamed = { pc1: { codexId: CodexId("brightness") } };
    expect(classReferenceCodexId(localParamClass, renamed)).toBe("brightness");
  });

  test("passes an imported class codexId through unchanged", () => {
    expect(classReferenceCodexId(importedParamClass, classTable)).toBe(
      "colorMode",
    );
  });

  test("falls back to the raw id when the local class is gone", () => {
    expect(classReferenceCodexId(localParamClass, {})).toBe("pc1");
  });
});

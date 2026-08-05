import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { ReactNode } from "react";
import {
  CodexId,
  DeviceClassDocument,
  documentTypes,
  EntityId,
} from "app/persistentState";
import { useAppPersistentStore } from "app/store";
import { initUndo, undo } from "app/undo";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { getWithId } from "app/stateUtils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import { DeviceClassClassEditing } from "features/deviceClassEditor/classEditing";
import { classKinds, useClassEditing } from "./context";
import {
  ClassOperations,
  commandMemberKinds,
  useClassOperations,
} from "./state";

const LOCALE = "en-US";
const EDITOR_ID = EntityId("test-editor-id");

const wrapper = ({ children }: { children: ReactNode }) => (
  <DeviceClassClassEditing>{children}</DeviceClassClassEditing>
);

function editor(): DeviceClassDocument {
  const state = useAppPersistentStore.getState();
  const document = state.documents[state.session.selectedDocumentId!];
  if (document.type !== documentTypes.DEVICE_CLASS) {
    throw new Error("The open document is not a device class");
  }
  return document;
}

function classIdOf(kind: keyof DeviceClassDocument, codexId: string): EntityId {
  const table = editor()[kind] as Record<EntityId, { codexId: CodexId }>;
  const found = getWithId(table, (cls) => cls.codexId === codexId);
  if (!found) {
    throw new Error(`No ${kind} with id ${codexId}`);
  }
  return found.id;
}

describe("classEditors/state.ts", () => {
  let stopUndo: () => void;
  let ops: { current: ClassOperations };

  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    stopUndo = initUndo();
    ops = renderHook(() => useClassOperations(), { wrapper }).result;
  });

  afterEach(() => {
    stopUndo();
  });

  describe("creating classes", () => {
    test("gives a new parameter class a data type it can be edited from", () => {
      act(() =>
        ops.current.createClass(
          classKinds.PARAMETER,
          CodexId("intensity"),
          "Intensity",
          LOCALE,
        ),
      );

      const created = Object.values(editor().parameterClasses);
      expect(created).toHaveLength(1);
      expect(created[0].codexId).toBe("intensity");
      expect(created[0].dataType).toBe("number");
    });

    test("gives a new resource class an empty list of media types", () => {
      act(() =>
        ops.current.createClass(
          classKinds.RESOURCE,
          CodexId("gobo"),
          "Gobo",
          LOCALE,
        ),
      );

      expect(Object.values(editor().resourceClasses)[0].mediaType).toEqual([]);
    });

    test("stores the name so it reads back in the authoring locale", () => {
      act(() =>
        ops.current.createClass(
          classKinds.STRUCTURE,
          CodexId("emitters"),
          "Emitters",
          LOCALE,
        ),
      );

      const created = Object.values(editor().structureClasses)[0];
      expect(
        editor().localizations[created.localized.name].strings[LOCALE],
      ).toBe("Emitters");
    });

    test("refuses a duplicate ID within the same kind", () => {
      act(() => {
        ops.current.createClass(
          classKinds.SERIALIZER,
          CodexId("dmx"),
          "DMX",
          LOCALE,
        );
        ops.current.createClass(
          classKinds.SERIALIZER,
          CodexId("dmx"),
          "DMX Again",
          LOCALE,
        );
      });

      expect(Object.values(editor().serializerClasses)).toHaveLength(1);
    });

    test("allows the same ID in two different kinds", () => {
      act(() => {
        ops.current.createClass(
          classKinds.SERIALIZER,
          CodexId("dmx"),
          "DMX",
          LOCALE,
        );
        ops.current.createClass(
          classKinds.STRUCTURE,
          CodexId("dmx"),
          "DMX",
          LOCALE,
        );
      });

      expect(Object.values(editor().serializerClasses)).toHaveLength(1);
      expect(Object.values(editor().structureClasses)).toHaveLength(1);
    });
  });

  describe("deleting classes", () => {
    test("takes the enum choices of a parameter class with it", () => {
      act(() =>
        ops.current.createClass(
          classKinds.PARAMETER,
          CodexId("mode"),
          "Mode",
          LOCALE,
        ),
      );
      const classId = classIdOf("parameterClasses", "mode");

      act(() =>
        ops.current.addEnumChoice(
          { type: "paramClass", id: classId },
          CodexId("open"),
          "Open",
          LOCALE,
        ),
      );
      expect(Object.values(editor().enumChoices)).toHaveLength(1);

      act(() => ops.current.deleteClass(classKinds.PARAMETER, classId));

      expect(Object.values(editor().parameterClasses)).toHaveLength(0);
      expect(Object.values(editor().enumChoices)).toHaveLength(0);
      expect(Object.values(editor().localizations)).toHaveLength(1); // only basicData's
    });

    test("takes a command class's arguments, return values and their choices with it", () => {
      act(() =>
        ops.current.createClass(
          classKinds.COMMAND,
          CodexId("reset"),
          "Reset",
          LOCALE,
        ),
      );
      const classId = classIdOf("commandClasses", "reset");

      act(() => {
        ops.current.addCommandClassMember(
          commandMemberKinds.ARGUMENT,
          classId,
          CodexId("scope"),
          "Scope",
          LOCALE,
        );
        ops.current.addCommandClassMember(
          commandMemberKinds.RETURN_VALUE,
          classId,
          CodexId("result"),
          "Result",
          LOCALE,
        );
      });

      const argId = classIdOf("commandClassArguments", "scope");
      act(() =>
        ops.current.addEnumChoice(
          { type: "cmdClassArg", id: argId },
          CodexId("all"),
          "All",
          LOCALE,
        ),
      );

      act(() => ops.current.deleteClass(classKinds.COMMAND, classId));

      expect(Object.values(editor().commandClasses)).toHaveLength(0);
      expect(Object.values(editor().commandClassArguments)).toHaveLength(0);
      expect(Object.values(editor().commandClassReturnValues)).toHaveLength(0);
      expect(Object.values(editor().enumChoices)).toHaveLength(0);
      expect(Object.values(editor().localizations)).toHaveLength(1);
    });

    test("undo brings a deleted class and its strings back", () => {
      act(() =>
        ops.current.createClass(
          classKinds.PARAMETER,
          CodexId("pan"),
          "Pan",
          LOCALE,
        ),
      );
      const classId = classIdOf("parameterClasses", "pan");

      act(() => ops.current.deleteClass(classKinds.PARAMETER, classId));
      expect(Object.values(editor().parameterClasses)).toHaveLength(0);

      act(() => undo(EDITOR_ID));

      const restored = Object.values(editor().parameterClasses);
      expect(restored).toHaveLength(1);
      expect(
        editor().localizations[restored[0].localized.name].strings[LOCALE],
      ).toBe("Pan");
    });
  });

  describe("class usage", () => {
    test("a class that a parameter references is reported as in use", () => {
      act(() =>
        ops.current.createClass(
          classKinds.PARAMETER,
          CodexId("tilt"),
          "Tilt",
          LOCALE,
        ),
      );
      const classId = classIdOf("parameterClasses", "tilt");

      updateCurrentEditor("Add test parameter", (draft) => {
        const paramId = EntityId("test-parameter");
        draft.parameters[paramId] = {
          codexId: CodexId("tilt-1"),
          class: { type: "local", id: classId },
          access: ["readActual"],
          lifetime: "runtime",
          localized: {},
        };
        draft.parameterEditors.push(paramId);
      });

      const { result } = renderHook(() => useClassEditing().getClassUsage, {
        wrapper,
      });

      expect(result.current(classKinds.PARAMETER, classId)).toEqual(["tilt-1"]);
    });

    test("an unreferenced class is reported as free", () => {
      act(() =>
        ops.current.createClass(
          classKinds.PARAMETER,
          CodexId("zoom"),
          "Zoom",
          LOCALE,
        ),
      );

      const { result } = renderHook(() => useClassEditing().getClassUsage, {
        wrapper,
      });

      expect(
        result.current(
          classKinds.PARAMETER,
          classIdOf("parameterClasses", "zoom"),
        ),
      ).toEqual([]);
    });
  });

  describe("enum choices", () => {
    test("closes the gap in the indexes when one in the middle goes", () => {
      act(() =>
        ops.current.createClass(
          classKinds.PARAMETER,
          CodexId("colour"),
          "Colour",
          LOCALE,
        ),
      );
      const classId = classIdOf("parameterClasses", "colour");
      const parent = { type: "paramClass" as const, id: classId };

      act(() => {
        ops.current.addEnumChoice(parent, CodexId("red"), "Red", LOCALE);
        ops.current.addEnumChoice(parent, CodexId("green"), "Green", LOCALE);
        ops.current.addEnumChoice(parent, CodexId("blue"), "Blue", LOCALE);
      });

      const greenId = classIdOf("enumChoices", "green");
      act(() => ops.current.deleteEnumChoice(greenId));

      const remaining = Object.values(editor().enumChoices);
      expect(remaining.map((c) => [c.codexId, c.index]).sort()).toEqual([
        ["blue", 1],
        ["red", 0],
      ]);
    });
  });
});

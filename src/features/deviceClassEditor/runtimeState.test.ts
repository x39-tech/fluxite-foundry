import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { EntityId } from "app/persistentState";
import { resetAppRuntimeStore } from "test/utils";
import {
  forgetClosedEditors,
  subscribeToEditorRuntimeField,
  updateEditorRuntimeState,
} from "./runtimeState";

const FIRST = EntityId("first");
const SECOND = EntityId("second");

describe("subscribeToEditorRuntimeField", () => {
  const listener = vi.fn();
  let unsubscribe: () => void;

  beforeEach(() => {
    resetAppRuntimeStore();
    listener.mockClear();
    unsubscribe = subscribeToEditorRuntimeField(
      "dmxControllerLayout",
      listener,
    );
  });

  afterEach(() => unsubscribe());

  test("reports the documents whose value of the field changed", () => {
    updateEditorRuntimeState(SECOND, (editor) => {
      editor.dmxControllerLayout = "vertical";
    });

    expect(listener).toHaveBeenCalledExactlyOnceWith([SECOND]);
  });

  test("ignores changes to an editor's other fields", () => {
    updateEditorRuntimeState(FIRST, (editor) => {
      editor.dmxControllerLayout = "vertical";
    });
    listener.mockClear();

    updateEditorRuntimeState(FIRST, (editor) => {
      editor.dmxControllerSerializer = EntityId("serializer");
      editor.sacnOutputSettings = { universe: 2, startAddress: 1 };
    });

    expect(listener).not.toHaveBeenCalled();
  });

  test("ignores an editor opening without a value for the field", () => {
    updateEditorRuntimeState(FIRST, (editor) => {
      editor.dmxControllerSerializer = EntityId("serializer");
    });

    expect(listener).not.toHaveBeenCalled();
  });

  test("reports an editor closing only if it had a value for the field", () => {
    updateEditorRuntimeState(FIRST, (editor) => {
      editor.dmxControllerLayout = "vertical";
    });
    updateEditorRuntimeState(SECOND, (editor) => {
      editor.dmxControllerSerializer = EntityId("serializer");
    });
    listener.mockClear();

    forgetClosedEditors({});

    expect(listener).toHaveBeenCalledExactlyOnceWith([FIRST]);
  });
});

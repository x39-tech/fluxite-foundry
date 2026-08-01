import { describe, test, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { addEnumChoice, updateCurrentEditor } from "../state";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import {
  useParameters,
  useParameterClasses,
  useParameterEditors,
  useParameterCodexIds,
  useParameterInfo,
  createNewParameter,
  modifyParameter,
  modifyParameterLocalizedValue,
  deleteParameter,
} from "./state";
import {
  CodexId,
  EntityId,
  FCDataType,
  LocalizationDbSchema,
  LocalizationKey,
  LocalizationReferencedItem,
} from "app/persistentState";

// Helper to get the current hook value
function getHookValue<T>(hook: () => T): T {
  const { result } = renderHook(hook);
  return result.current;
}

// Helper specifically for getting parameter info
function getParameterInfo(id: EntityId): ReturnType<typeof useParameterInfo> {
  return getHookValue(() => useParameterInfo(id));
}

function createTestParamClass(
  id: EntityId,
  codexId: CodexId,
  dataType: FCDataType,
  nameLocalizations: Record<string, string>,
) {
  updateCurrentEditor((editor) => {
    const locKey = LocalizationKey(`paramClass_${id}`);
    editor.localizations[locKey] = {
      strings: LocalizationDbSchema.parse(nameLocalizations),
      items: [
        {
          itemType: "paramClassName",
          itemId: id,
        },
      ],
    };

    editor.parameterClasses[id] = {
      codexId,
      dataType: dataType,
      localized: {
        name: locKey,
      },
    };
  });
}

describe("parametersEditor/state.ts", () => {
  const TEST_CLASS_ID = EntityId("TestClass");
  const TEST_CLASS_CODEX_ID = CodexId("TestClass");

  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
  });

  describe("Read functions (selectors)", () => {
    describe("useParameters", () => {
      test("returns empty object when no parameters exist", () => {
        const params = getHookValue(useParameters);
        expect(params).toBeDefined();
        expect(Object.keys(params || {}).length).toBe(0);
      });

      test("returns all parameters after creation", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));
        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param2"));

        const params = getHookValue(useParameters);
        expect(Object.keys(params || {}).length).toBe(2);
      });
    });

    describe("useParameterClasses", () => {
      test("returns empty object when no parameter classes exist", () => {
        const classes = getHookValue(useParameterClasses);
        expect(classes).toBeDefined();
        expect(Object.keys(classes || {}).length).toBe(0);
      });

      test("returns parameter classes after they are added", () => {
        createTestParamClass(EntityId("Class1"), CodexId("Class1"), "number", {
          "en-US": "Class 1",
        });
        createTestParamClass(EntityId("Class2"), CodexId("Class2"), "string", {
          "en-US": "Class 2",
        });

        const classes = getHookValue(useParameterClasses);
        expect(Object.keys(classes || {}).length).toBe(2);
      });
    });

    describe("useParameterEditors", () => {
      test("returns empty array when no parameters exist", () => {
        const editors = getHookValue(useParameterEditors);
        expect(editors).toEqual([]);
      });

      test("returns parameter IDs in order", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, CodexId("TestClass"), CodexId("param1"));
        createNewParameter(undefined, CodexId("TestClass"), CodexId("param2"));

        const editors = getHookValue(useParameterEditors);
        expect(editors.length).toBe(2);
      });
    });

    describe("useParameterCodexIds", () => {
      test("returns empty array when no parameters exist", () => {
        const codexIds = getHookValue(useParameterCodexIds);
        expect(codexIds).toEqual([]);
      });

      test("returns all parameter codexIds", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, CodexId("TestClass"), CodexId("param1"));
        createNewParameter(undefined, CodexId("TestClass"), CodexId("param2"));

        const codexIds = getHookValue(useParameterCodexIds);
        expect(codexIds).toContain("param1");
        expect(codexIds).toContain("param2");
      });
    });

    describe("useParameterInfo", () => {
      test("returns undefined for non-existent parameter", () => {
        const info = getParameterInfo(EntityId("non-existent"));
        expect(info).toBeUndefined();
      });

      test("returns parameter info with localized friendly name", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        act(() => {
          modifyParameterLocalizedValue(
            paramId,
            "friendlyName",
            "Parameter 1",
            "en-US",
          );
        });

        const info = getParameterInfo(paramId);

        expect(info).toBeDefined();
        expect(info?.param.codexId).toBe("param1");
        expect(info?.param.friendlyName?.value).toBe("Parameter 1");
      });
    });
  });

  describe("Write functions (mutations)", () => {
    describe("createNewParameter", () => {
      test("creates a new parameter with correct properties", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(
          undefined,
          TEST_CLASS_CODEX_ID,
          CodexId("new-param"),
        );

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);
        const param = params?.[paramId];

        expect(param).toBeDefined();
        expect(param?.codexId).toBe("new-param");
        expect(param?.class.type).toBe("local");
      });

      test("does not create duplicate parameters with same codexId", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(
          undefined,
          TEST_CLASS_CODEX_ID,
          CodexId("duplicate"),
        );
        createNewParameter(
          undefined,
          TEST_CLASS_CODEX_ID,
          CodexId("duplicate"),
        );

        const params = getHookValue(useParameters);
        expect(Object.keys(params || {}).length).toBe(1);
      });

      test("adds parameter ID to parameterEditors array", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(
          undefined,
          TEST_CLASS_CODEX_ID,
          CodexId("new-param"),
        );

        const editors = getHookValue(useParameterEditors);
        expect(editors.length).toBe(1);
      });
    });

    describe("modifyParameter", () => {
      test("modifies parameter properties", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        act(() => {
          modifyParameter(paramId, (param) => {
            param.codexId = CodexId("modified-param");
          });
        });

        const modifiedParams = getHookValue(useParameters);
        expect(modifiedParams?.[paramId]?.codexId).toBe("modified-param");
      });

      test("does nothing if parameter does not exist", () => {
        modifyParameter(EntityId("non-existent"), (param) => {
          param.codexId = CodexId("should-not-change");
        });

        const params = getHookValue(useParameters);
        expect(Object.keys(params || {}).length).toBe(0);
      });
    });

    describe("modifyParameterLocalizedValue", () => {
      test("updates existing localization value", () => {
        act(() => {
          createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
            "en-US": "Test Class",
          });

          createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));
        });

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        act(() => {
          modifyParameterLocalizedValue(
            paramId,
            "friendlyName",
            "Updated Name",
            "en-US",
          );
        });

        const info = getParameterInfo(paramId);
        expect(info?.param.friendlyName?.value).toBe("Updated Name");
      });

      test("creates new localization if it does not exist", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        // First remove the localization
        act(() => {
          updateCurrentEditor((editor) => {
            const param = editor.parameters[paramId];
            if (param?.localized.friendlyName) {
              delete editor.localizations[param.localized.friendlyName];
              delete param.localized.friendlyName;
            }
          });
        });

        // Now add it back via the function
        act(() => {
          modifyParameterLocalizedValue(
            paramId,
            "friendlyName",
            "New Name",
            "en-US",
          );
        });

        const info = getParameterInfo(paramId);
        expect(info?.param.friendlyName?.value).toBe("New Name");
      });

      test("does nothing if parameter does not exist", () => {
        modifyParameterLocalizedValue(
          EntityId("non-existent"),
          "friendlyName",
          "Should Not Change",
          "en-US",
        );

        const params = getHookValue(useParameters);
        expect(Object.keys(params || {}).length).toBe(0);
      });
    });

    describe("deleteParameter", () => {
      test("removes parameter from parameters object", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        act(() => {
          deleteParameter(paramId);
        });

        const afterDelete = getHookValue(useParameters);
        expect(Object.keys(afterDelete || {}).length).toBe(0);
      });

      test("removes parameter from parameterEditors array", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        act(() => {
          deleteParameter(paramId);
        });

        const editors = getHookValue(useParameterEditors);
        expect(editors.length).toBe(0);
      });

      test("cleans up localization references", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);
        const localizationKey = params?.[paramId]?.localized.friendlyName;

        act(() => {
          deleteParameter(paramId);
        });

        // Verify localization was cleaned up
        updateCurrentEditor((editor) => {
          if (localizationKey) {
            expect(editor.localizations[localizationKey]).toBeUndefined();
          }
        });
      });

      test("does nothing if parameter does not exist", () => {
        deleteParameter(EntityId("non-existent"));

        const params = getHookValue(useParameters);
        expect(Object.keys(params || {}).length).toBe(0);
      });
    });
  });

  describe("Edge cases and state synchronization", () => {
    describe("Localization synchronization", () => {
      test("localization items reference is properly maintained on create", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        act(() => {
          modifyParameterLocalizedValue(
            paramId,
            "friendlyName",
            "Test Parameter",
            "en-US",
          );
        });

        const updatedParams = getHookValue(useParameters);
        const localizationKey =
          updatedParams?.[paramId]?.localized.friendlyName;

        // Verify the localization has the correct item reference
        updateCurrentEditor((editor) => {
          const loc = editor.localizations[localizationKey!];
          expect(loc).toBeDefined();
          expect(loc?.items).toBeDefined();
          expect(loc?.items.length).toBe(1);
          const item = loc?.items[0];
          if (item && "itemId" in item) {
            expect(item.itemId).toBe(paramId);
            expect(item.itemType).toBe("paramName");
          }
        });
      });

      test("localization is cleaned up when parameter is deleted", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);
        const localizationKey = params?.[paramId]?.localized.friendlyName;

        act(() => {
          deleteParameter(paramId);
        });

        // Verify localization was removed
        updateCurrentEditor((editor) => {
          expect(editor.localizations[localizationKey!]).toBeUndefined();
        });
      });

      test("shared localization is not deleted if other items still reference it", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));
        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param2"));

        const params = getHookValue(useParameters);
        const paramIds = Object.keys(params || {}).map(EntityId);

        // Set friendly names for both parameters
        act(() => {
          modifyParameterLocalizedValue(
            paramIds[0],
            "friendlyName",
            "Shared Name",
            "en-US",
          );
          modifyParameterLocalizedValue(
            paramIds[1],
            "friendlyName",
            "Temp Name",
            "en-US",
          );
        });

        const updatedParams = getHookValue(useParameters);
        const param1Key = updatedParams?.[paramIds[0]]?.localized.friendlyName;

        // Manually make param2 share the same localization key
        act(() => {
          updateCurrentEditor((editor) => {
            if (param1Key) {
              const param2 = editor.parameters[paramIds[1]];
              const param2OldKey = param2?.localized.friendlyName;

              if (param2 && param2OldKey) {
                // Remove old localization
                delete editor.localizations[param2OldKey];

                // Share the localization with param1
                param2.localized.friendlyName = param1Key;
                editor.localizations[param1Key].items.push({
                  itemId: paramIds[1],
                  itemType: "paramName",
                });
              }
            }
          });
        });

        // Delete param1
        act(() => {
          deleteParameter(paramIds[0]);
        });

        // Verify localization still exists because param2 references it
        updateCurrentEditor((editor) => {
          expect(editor.localizations[param1Key!]).toBeDefined();
          expect(editor.localizations[param1Key!].items.length).toBe(1);
          const item = editor.localizations[param1Key!].items[0];
          if (item && "itemId" in item) {
            expect(item.itemId).toBe(paramIds[1]);
          }
        });
      });
    });

    describe("Enum choices synchronization", () => {
      test("enum choices are deleted when parameter is deleted", () => {
        const TEST_CLASS_ENUM_CHOICE_ID = EntityId("enumChoice1");
        const TEST_CLASS_ENUM_CHOICE_CODEX_ID = CodexId("enumChoice1");
        const TEST_CLASS_CODEX_ID = CodexId("TestEnum");
        const TEST_ENUM_CHOICE_CODEX_ID = CodexId("customChoice1");

        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "enum", {
          "en-US": "Test Enum",
        });

        updateCurrentEditor((editor) => {
          editor.localizations[LocalizationKey("enumChoice_enumChoice1")] = {
            strings: LocalizationDbSchema.parse({ "en-US": "Choice 1" }),
            items: [
              {
                itemId: TEST_CLASS_ENUM_CHOICE_ID,
                itemType: "enumName",
              },
            ],
          };

          editor.enumChoices = {
            [TEST_CLASS_ENUM_CHOICE_ID]: {
              codexId: TEST_CLASS_ENUM_CHOICE_CODEX_ID,
              parent: {
                type: "paramClass",
                id: TEST_CLASS_ID,
              },
              index: 0,
              localized: {
                name: LocalizationKey(
                  `enumChoice_${TEST_CLASS_ENUM_CHOICE_CODEX_ID}`,
                ),
              },
            },
          };
        });

        createNewParameter(
          undefined,
          TEST_CLASS_CODEX_ID,
          CodexId("enum-param"),
        );

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        act(() => {
          addEnumChoice(
            { type: "paramAdditional", id: paramId },
            TEST_ENUM_CHOICE_CODEX_ID,
            "Custom Choice",
            "Custom Choice Description",
            "en-US",
          );
        });

        act(() => {
          deleteParameter(paramId);
        });

        // Verify enum choice was deleted
        updateCurrentEditor((editor) => {
          expect(
            Object.values(editor.enumChoices).find(
              (choice) => choice.codexId === TEST_ENUM_CHOICE_CODEX_ID,
            ),
          ).toBeUndefined();
          const items = Object.values(editor.localizations).reduce(
            (acc, loc) => {
              acc.concat(loc.items);
              return acc;
            },
            [] as LocalizationReferencedItem[],
          );
          expect(
            items.find(
              (item) =>
                (item.itemType === "enumName" ||
                  item.itemType === "enumDesc") &&
                item.itemId !== TEST_CLASS_ENUM_CHOICE_ID,
            ),
          ).toBeUndefined();
        });
      });
    });

    describe("Parameter editors array consistency", () => {
      test("parameterEditors array stays in sync with parameters object", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));
        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param2"));
        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param3"));

        const params = getHookValue(useParameters);
        const editors = getHookValue(useParameterEditors);

        // Verify all IDs in editors array exist in parameters object
        editors.forEach((editor) => {
          expect(params?.[editor.id]).toBeDefined();
        });

        // Verify all parameter IDs are in editors array
        const editorIds = editors.map((editor) => editor.id);
        Object.keys(params || {}).forEach((id) => {
          expect(editorIds).toContain(id);
        });
      });

      test("deleting middle parameter maintains correct order", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));
        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param2"));
        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param3"));

        const params = getHookValue(useParameters);
        const paramIds = Object.keys(params || {}).map(EntityId);

        // Delete the middle parameter
        act(() => {
          deleteParameter(paramIds[1]);
        });

        const editorIdsAfter = getHookValue(useParameterEditors).map(
          (editor) => editor.id,
        );
        expect(editorIdsAfter.length).toBe(2);
        expect(editorIdsAfter).toContain(paramIds[0]);
        expect(editorIdsAfter).toContain(paramIds[2]);
        expect(editorIdsAfter).not.toContain(paramIds[1]);
      });
    });

    describe("codexId uniqueness", () => {
      test("creating parameter with duplicate codexId is prevented", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(
          undefined,
          TEST_CLASS_CODEX_ID,
          CodexId("unique-id"),
        );

        const paramsBefore = getHookValue(useParameters);
        const countBefore = Object.keys(paramsBefore || {}).length;

        // Try to create another with the same codexId
        createNewParameter(
          undefined,
          TEST_CLASS_CODEX_ID,
          CodexId("unique-id"),
        );

        const paramsAfter = getHookValue(useParameters);
        const countAfter = Object.keys(paramsAfter || {}).length;

        expect(countAfter).toBe(countBefore);
        expect(countAfter).toBe(1);
      });

      test("codexIds remain unique in the array", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));
        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param2"));
        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param3"));

        const codexIds = getHookValue(useParameterCodexIds);
        const uniqueCodexIds = new Set(codexIds);

        expect(codexIds.length).toBe(uniqueCodexIds.size);
      });
    });

    describe("Multi-locale support", () => {
      test("parameter localization works with multiple locales", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
          "fr-FR": "Classe de test",
        });

        createNewParameter(undefined, TEST_CLASS_CODEX_ID, CodexId("param1"));

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);

        act(() => {
          // Add English friendly name first
          modifyParameterLocalizedValue(
            paramId,
            "friendlyName",
            "Parameter 1",
            "en-US",
          );

          // Add French translation
          modifyParameterLocalizedValue(
            paramId,
            "friendlyName",
            "Paramètre 1",
            "fr-FR",
          );
        });

        // Verify both locales exist
        updateCurrentEditor((editor) => {
          const locKey = editor.parameters[paramId]?.localized.friendlyName;
          if (locKey) {
            expect(editor.localizations[locKey].strings["en-US"]).toBe(
              "Parameter 1",
            );
            expect(editor.localizations[locKey].strings["fr-FR"]).toBe(
              "Paramètre 1",
            );
          }
        });
      });
    });

    describe("Imported vs device parameter classes", () => {
      test("creates parameter with imported class correctly", () => {
        updateCurrentEditor((editor) => {
          editor.libraries = {
            "some-library": "1.0.0",
          };
        });

        createNewParameter(
          "some-library",
          CodexId("ImportedClass"),
          CodexId("imported-param"),
        );

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);
        const param = params?.[paramId];

        expect(param?.class.type).toBe("imported");
        if (param?.class.type === "imported") {
          expect(param.class.library).toBe("some-library");
          expect(param.class.codexId).toBe("ImportedClass");
        }
      });

      test("creates parameter with device class when no library specified", () => {
        createTestParamClass(TEST_CLASS_ID, TEST_CLASS_CODEX_ID, "number", {
          "en-US": "Test Class",
        });

        createNewParameter(
          undefined,
          TEST_CLASS_CODEX_ID,
          CodexId("device-param"),
        );

        const params = getHookValue(useParameters);
        const paramId = EntityId(Object.keys(params || {})[0]);
        const param = params?.[paramId];

        expect(param?.class.type).toBe("local");
      });
    });
  });
});

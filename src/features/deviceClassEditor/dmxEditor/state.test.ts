import { describe, test, expect, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { getCurrentEditor, updateCurrentEditor } from "../state";
import {
  createEmptyDeviceClassEditor,
  resetAllStores,
  testUndoLabel,
} from "test/utils";
import {
  CodexId,
  DmxSerializer,
  EntityId,
  FCDataType,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { useAppPersistentStore } from "app/store";
import {
  addCondition,
  addDmxChunk,
  addDmxMode,
  changeDmxModeCodexId,
  deleteDmxMode,
  duplicateDmxMode,
  addParameterMappingGroup,
  addParameterMapping,
  getChildConditions,
  getConditionsForMappingGroup,
  getMappingGroupsForChunk,
  removeCondition,
  removeDmxChunk,
  removeParameterMapping,
  removeParameterMappingGroup,
  selectTabDmxSerializer,
  useTabDmxSerializerId,
} from "./state";

const TEST_CLASS_ID = EntityId("TestClass");
const TEST_CLASS_CODEX_ID = CodexId("TestClass");
const TEST_PARAM_ID = EntityId("param1");
const TEST_PARAM_CODEX_ID = CodexId("param1");

function getHookValue<T>(hook: () => T): T {
  const { result } = renderHook(hook);
  return result.current;
}

function createTestParamClass(
  id: EntityId = TEST_CLASS_ID,
  codexId: CodexId = TEST_CLASS_CODEX_ID,
  dataType: FCDataType = "number",
  nameLocalizations: Record<string, string> = { "en-US": "Test Class" },
) {
  updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
    const locKey = LocalizationKey(`paramClass_${id}`);
    editor.localizations[locKey] = {
      strings: LocalizationDbSchema.parse(nameLocalizations),
    };

    editor.parameterClasses[id] = {
      codexId,
      dataType,
      localized: {
        name: locKey,
      },
    };
  });
}

function createTestParameter(
  id: EntityId = TEST_PARAM_ID,
  codexId: CodexId = TEST_PARAM_CODEX_ID,
  classCodexId: CodexId = TEST_CLASS_CODEX_ID,
  count?: number,
) {
  updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
    editor.parameters[id] = {
      codexId,
      class: {
        type: "local",
        id: EntityId(`class_${classCodexId}`),
      },
      count: count !== undefined ? { type: "fixed", value: count } : undefined,
      access: ["readActual", "readTarget", "write"],
      lifetime: "persistent",
      localized: {},
    };
    editor.parameterEditors.push(id);
  });
}

function setupBasicDmxChunk() {
  createTestParamClass();
  createTestParameter();
  addDmxChunk(serializerId);
}

function getChunkId(): EntityId {
  const dmx = getDmx();
  return Object.keys(dmx?.chunks || {})[0] as EntityId;
}

function getMappingGroupId(chunkId: EntityId): EntityId {
  const dmx = getDmx();
  if (!dmx) throw new Error("No dmx serializer");
  const groups = getMappingGroupsForChunk(dmx, chunkId);
  if (groups.length === 0) throw new Error("No mapping groups found");
  return groups[0].id;
}

// The serializer edited by the tests.
let serializerId: EntityId;

function getSerializers(): Record<EntityId, DmxSerializer> {
  return (
    getCurrentEditor(useAppPersistentStore.getState())?.dmxSerializers ?? {}
  );
}

function getDmx(): DmxSerializer | undefined {
  return getSerializers()[serializerId];
}

describe("dmxEditor/state.ts", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    addDmxMode();
    serializerId = Object.keys(getSerializers())[0] as EntityId;
  });

  describe("Parameter mapping operations", () => {
    describe("addParameterMapping", () => {
      test("creates mapping with simple parameter (no count)", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
        });

        const dmx = getDmx();
        const mappingGroup = dmx?.mappingGroups[mappingGroupId];

        expect(mappingGroup?.mappings.length).toBe(1);
        expect(mappingGroup?.mappings[0].mappedParam.id).toBe(TEST_PARAM_ID);
        expect(mappingGroup?.mappings[0].mappedParam.index).toBe(undefined);
        expect(mappingGroup?.mappings[0].ranges).toEqual([]);
      });

      test("creates mapping with count=1 parameter", () => {
        act(() => {
          createTestParamClass();
          createTestParameter(
            TEST_PARAM_ID,
            TEST_PARAM_CODEX_ID,
            TEST_CLASS_CODEX_ID,
            1,
          );
          addDmxChunk(serializerId);
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
        });

        const dmx = getDmx();
        const mappingGroup = dmx?.mappingGroups[mappingGroupId];

        expect(mappingGroup?.mappings.length).toBe(1);
        expect(mappingGroup?.mappings[0].mappedParam.id).toBe(TEST_PARAM_ID);
        expect(mappingGroup?.mappings[0].mappedParam.index).toBe(undefined);
      });

      test("creates mapping with index 0 for parameter with count > 1", () => {
        act(() => {
          createTestParamClass();
          createTestParameter(
            TEST_PARAM_ID,
            TEST_PARAM_CODEX_ID,
            TEST_CLASS_CODEX_ID,
            3,
          );
          addDmxChunk(serializerId);
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
        });

        const dmx = getDmx();
        const mappingGroup = dmx?.mappingGroups[mappingGroupId];

        expect(mappingGroup?.mappings.length).toBe(1);
        expect(mappingGroup?.mappings[0].mappedParam.id).toBe(TEST_PARAM_ID);
        expect(mappingGroup?.mappings[0].mappedParam.index).toBe(0);
        expect(mappingGroup?.mappings[0].ranges).toEqual([]);
      });

      test("does nothing if mapping group does not exist", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(
            serializerId,
            EntityId("non-existent-mapping-group"),
          );
        });

        const dmx = getDmx();
        const mappingGroup = dmx?.mappingGroups[mappingGroupId];

        expect(mappingGroup?.mappings.length).toBe(0);
      });

      test("does nothing if no parameters exist", () => {
        act(() => {
          addDmxChunk(serializerId);
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
        });

        const dmx = getDmx();
        const mappingGroup = dmx?.mappingGroups[mappingGroupId];

        expect(mappingGroup?.mappings.length).toBe(0);
      });

      test("adds multiple mappings to same group", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
          addParameterMapping(serializerId, mappingGroupId);
        });

        const dmx = getDmx();
        const mappingGroup = dmx?.mappingGroups[mappingGroupId];

        expect(mappingGroup?.mappings.length).toBe(2);
      });

      test("adds mapping to different mapping group", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();

        act(() => {
          addParameterMappingGroup(serializerId, chunkId);
        });

        const dmx = getDmx();
        const groups = getMappingGroupsForChunk(dmx!, chunkId);
        const firstGroupId = groups[0].id;
        const secondGroupId = groups[1].id;

        act(() => {
          addParameterMapping(serializerId, firstGroupId);
          addParameterMapping(serializerId, secondGroupId);
        });

        const dmx2 = getDmx();

        expect(dmx2?.mappingGroups[firstGroupId].mappings.length).toBe(1);
        expect(dmx2?.mappingGroups[secondGroupId].mappings.length).toBe(1);
      });
    });

    describe("removeParameterMapping", () => {
      test("removes mapping from group", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
          addParameterMapping(serializerId, mappingGroupId);
        });

        let dmx = getDmx();
        expect(dmx?.mappingGroups[mappingGroupId].mappings.length).toBe(2);

        act(() => {
          removeParameterMapping(serializerId, mappingGroupId, 0);
        });

        dmx = getDmx();
        expect(dmx?.mappingGroups[mappingGroupId].mappings.length).toBe(1);
      });

      test("removes correct mapping by index", () => {
        act(() => {
          createTestParamClass();
          createTestParameter(
            TEST_PARAM_ID,
            TEST_PARAM_CODEX_ID,
            TEST_CLASS_CODEX_ID,
            3,
          );
          addDmxChunk(serializerId);
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
          addParameterMapping(serializerId, mappingGroupId);
          addParameterMapping(serializerId, mappingGroupId);

          updateCurrentEditor(testUndoLabel("Test Change"), (editor) => {
            const mappingGroup = Object.values(editor.dmxSerializers)[0]
              ?.mappingGroups[mappingGroupId];
            if (mappingGroup) {
              mappingGroup.mappings[0].mappedParam.index = 0;
              mappingGroup.mappings[1].mappedParam.index = 1;
              mappingGroup.mappings[2].mappedParam.index = 2;
            }
          });
        });

        act(() => {
          removeParameterMapping(serializerId, mappingGroupId, 1);
        });

        const dmx = getDmx();
        const mappings = dmx?.mappingGroups[mappingGroupId].mappings;

        expect(mappings?.length).toBe(2);
        expect(mappings?.[0].mappedParam.index).toBe(0);
        expect(mappings?.[1].mappedParam.index).toBe(2);
      });

      test("does nothing if mapping group does not exist", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
          removeParameterMapping(
            serializerId,
            EntityId("non-existent-mapping-group"),
            0,
          );
        });

        const dmx = getDmx();
        expect(dmx?.mappingGroups[mappingGroupId].mappings.length).toBe(1);
      });

      test("removes last mapping from group", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        act(() => {
          addParameterMapping(serializerId, mappingGroupId);
          removeParameterMapping(serializerId, mappingGroupId, 0);
        });

        const dmx = getDmx();
        expect(dmx?.mappingGroups[mappingGroupId].mappings.length).toBe(0);
      });

      test("removes mapping from correct group when multiple groups exist", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();

        act(() => {
          addParameterMappingGroup(serializerId, chunkId);
        });

        const dmx = getDmx();
        const groups = getMappingGroupsForChunk(dmx!, chunkId);
        const firstGroupId = groups[0].id;
        const secondGroupId = groups[1].id;

        act(() => {
          addParameterMapping(serializerId, firstGroupId);
          addParameterMapping(serializerId, firstGroupId);
          addParameterMapping(serializerId, secondGroupId);
        });

        act(() => {
          removeParameterMapping(serializerId, firstGroupId, 1);
        });

        const dmx2 = getDmx();
        expect(dmx2?.mappingGroups[firstGroupId].mappings.length).toBe(1);
        expect(dmx2?.mappingGroups[secondGroupId].mappings.length).toBe(1);
      });
    });
  });

  describe("Cascading deletions", () => {
    describe("removeDmxChunk", () => {
      test("removes associated mapping groups when chunk is deleted", () => {
        act(() => {
          setupBasicDmxChunk();
        });

        const chunkId = getChunkId();
        const mappingGroupId = getMappingGroupId(chunkId);

        // Verify mapping group exists
        let dmx = getDmx();
        expect(dmx?.mappingGroups[mappingGroupId]).toBeDefined();

        act(() => {
          removeDmxChunk(serializerId, chunkId);
        });

        dmx = getDmx();
        expect(dmx?.chunks[chunkId]).toBeUndefined();
        expect(dmx?.mappingGroups[mappingGroupId]).toBeUndefined();
      });

      test("removes conditions when chunk is deleted", () => {
        act(() => {
          setupBasicDmxChunk();
          addDmxChunk(serializerId); // Add a second chunk so we can add conditions
        });

        const dmx1 = getDmx();
        const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
        const firstChunkId = chunkIds[0];
        const mappingGroupId = getMappingGroupId(firstChunkId);

        act(() => {
          addCondition(serializerId, mappingGroupId, firstChunkId);
        });

        // Verify condition was created
        let dmx = getDmx();
        expect(Object.keys(dmx!.conditions).length).toBeGreaterThan(0);

        act(() => {
          removeDmxChunk(serializerId, firstChunkId);
        });

        dmx = getDmx();
        expect(dmx?.chunks[firstChunkId]).toBeUndefined();
        // All conditions for the deleted chunk's mapping groups should be gone
        const remainingConditions = Object.values(dmx!.conditions).filter(
          (cond) =>
            cond.parent.type === "mappingGroup" &&
            cond.parent.id === mappingGroupId,
        );
        expect(remainingConditions.length).toBe(0);
      });

      test("removes conditions that reference the deleted chunk", () => {
        act(() => {
          setupBasicDmxChunk();
          addDmxChunk(serializerId); // Add a second chunk
        });

        const dmx1 = getDmx();
        const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
        const firstChunkId = chunkIds[0];
        const secondChunkId = chunkIds[1];
        const secondChunkMappingGroupId = getMappingGroupsForChunk(
          dmx1!,
          secondChunkId,
        )[0].id;

        // Add a condition to second chunk that references first chunk
        act(() => {
          addCondition(serializerId, secondChunkMappingGroupId, secondChunkId);
        });

        // Verify condition references the first chunk
        let dmx = getDmx();
        const conditionsBefore = Object.entries(dmx!.conditions);
        expect(conditionsBefore.length).toBeGreaterThan(0);

        // Find the chunkRef condition
        const chunkRefCondition = conditionsBefore.find(
          ([_, cond]) =>
            cond.conditionType === "chunkRef" && cond.chunkId === firstChunkId,
        );
        expect(chunkRefCondition).toBeDefined();

        // Delete the first chunk
        act(() => {
          removeDmxChunk(serializerId, firstChunkId);
        });

        dmx = getDmx();
        // The chunkRef condition that referenced the deleted chunk should be gone
        const remainingChunkRefConditions = Object.values(
          dmx!.conditions,
        ).filter(
          (cond) =>
            cond.conditionType === "chunkRef" && cond.chunkId === firstChunkId,
        );
        expect(remainingChunkRefConditions.length).toBe(0);
      });
    });

    describe("removeParameterMappingGroup", () => {
      test("removes associated conditions when mapping group is deleted", () => {
        act(() => {
          setupBasicDmxChunk();
          addDmxChunk(serializerId); // Need two chunks for conditions
        });

        const dmx1 = getDmx();
        const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
        const firstChunkId = chunkIds[0];
        const mappingGroupId = getMappingGroupId(firstChunkId);

        act(() => {
          addCondition(serializerId, mappingGroupId, firstChunkId);
        });

        // Verify conditions exist
        let dmx = getDmx();
        const conditionsBefore = getConditionsForMappingGroup(
          dmx!,
          mappingGroupId,
        );
        expect(conditionsBefore.length).toBeGreaterThan(0);

        act(() => {
          removeParameterMappingGroup(
            serializerId,
            firstChunkId,
            mappingGroupId,
          );
        });

        dmx = getDmx();
        expect(dmx?.mappingGroups[mappingGroupId]).toBeUndefined();

        // All conditions that belonged to this mapping group should be gone
        const conditionsAfter = Object.values(dmx!.conditions).filter(
          (cond) =>
            cond.parent.type === "mappingGroup" &&
            cond.parent.id === mappingGroupId,
        );
        expect(conditionsAfter.length).toBe(0);
      });

      test("removes child conditions when mapping group with nested conditions is deleted", () => {
        act(() => {
          setupBasicDmxChunk();
          addDmxChunk(serializerId);
        });

        const dmx1 = getDmx();
        const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
        const firstChunkId = chunkIds[0];
        const mappingGroupId = getMappingGroupId(firstChunkId);

        // Add multiple conditions to create a group with children
        act(() => {
          addCondition(serializerId, mappingGroupId, firstChunkId);
          addCondition(serializerId, mappingGroupId, firstChunkId);
        });

        let dmx = getDmx();
        const totalConditionsBefore = Object.keys(dmx!.conditions).length;
        expect(totalConditionsBefore).toBeGreaterThan(0);

        act(() => {
          removeParameterMappingGroup(
            serializerId,
            firstChunkId,
            mappingGroupId,
          );
        });

        dmx = getDmx();
        // All conditions (parent group and children) should be removed
        const remainingConditionsForGroup = Object.values(
          dmx!.conditions,
        ).filter((cond) => {
          if (cond.parent.type === "mappingGroup") {
            return cond.parent.id === mappingGroupId;
          }
          return false;
        });
        expect(remainingConditionsForGroup.length).toBe(0);
      });
    });

    describe("removeCondition", () => {
      test("removes child conditions when parent condition is deleted", () => {
        act(() => {
          setupBasicDmxChunk();
          addDmxChunk(serializerId);
        });

        const dmx1 = getDmx();
        const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
        const firstChunkId = chunkIds[0];
        const mappingGroupId = getMappingGroupId(firstChunkId);

        // Add conditions - this creates a group condition with a chunkRef child
        act(() => {
          addCondition(serializerId, mappingGroupId, firstChunkId);
        });

        let dmx = getDmx();
        const conditions = getConditionsForMappingGroup(dmx!, mappingGroupId);
        expect(conditions.length).toBe(1);

        // The top-level condition should be a group
        const groupCondition = conditions[0];
        expect(groupCondition.conditionType).toBe("group");

        // It should have child conditions
        const children = getChildConditions(dmx!, groupCondition.id);
        expect(children.length).toBe(1);
        const childConditionId = children[0].id;

        // Remove the parent group condition
        act(() => {
          removeCondition(serializerId, groupCondition.id);
        });

        dmx = getDmx();
        // Both parent and child should be gone
        expect(dmx?.conditions[groupCondition.id]).toBeUndefined();
        expect(dmx?.conditions[childConditionId]).toBeUndefined();
      });

      test("removes deeply nested child conditions", () => {
        act(() => {
          setupBasicDmxChunk();
          addDmxChunk(serializerId);
        });

        const dmx1 = getDmx();
        const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
        const firstChunkId = chunkIds[0];
        const mappingGroupId = getMappingGroupId(firstChunkId);

        // Add multiple conditions to create nested structure
        act(() => {
          addCondition(serializerId, mappingGroupId, firstChunkId);
          addCondition(serializerId, mappingGroupId, firstChunkId);
          addCondition(serializerId, mappingGroupId, firstChunkId);
        });

        let dmx = getDmx();
        const totalConditionsBefore = Object.keys(dmx!.conditions).length;
        // Should have: 1 group condition + 3 chunkRef children = 4 conditions
        expect(totalConditionsBefore).toBe(4);

        // Find and remove the group condition
        const conditions = getConditionsForMappingGroup(dmx!, mappingGroupId);
        const groupConditionId = conditions[0].id;

        act(() => {
          removeCondition(serializerId, groupConditionId);
        });

        dmx = getDmx();
        // All conditions should be gone
        expect(Object.keys(dmx!.conditions).length).toBe(0);
      });

      test("only removes the specified condition and its children, not siblings", () => {
        act(() => {
          setupBasicDmxChunk();
          addDmxChunk(serializerId);
        });

        const dmx1 = getDmx();
        const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
        const firstChunkId = chunkIds[0];
        const mappingGroupId = getMappingGroupId(firstChunkId);

        act(() => {
          addCondition(serializerId, mappingGroupId, firstChunkId);
          addCondition(serializerId, mappingGroupId, firstChunkId);
        });

        let dmx = getDmx();
        const groupConditions = getConditionsForMappingGroup(
          dmx!,
          mappingGroupId,
        );
        const groupConditionId = groupConditions[0].id;
        const children = getChildConditions(dmx!, groupConditionId);
        expect(children.length).toBe(2);

        const firstChildId = children[0].id;
        const secondChildId = children[1].id;

        // Remove only the first child
        act(() => {
          removeCondition(serializerId, firstChildId);
        });

        dmx = getDmx();
        // First child should be gone
        expect(dmx?.conditions[firstChildId]).toBeUndefined();
        // Second child should still exist
        expect(dmx?.conditions[secondChildId]).toBeDefined();
        // Parent group should still exist
        expect(dmx?.conditions[groupConditionId]).toBeDefined();
      });
    });
  });

  describe("Condition creation", () => {
    test("creates group condition with chunkRef child when first condition is added", () => {
      act(() => {
        setupBasicDmxChunk();
        addDmxChunk(serializerId);
      });

      const dmx1 = getDmx();
      const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
      const firstChunkId = chunkIds[0];
      const secondChunkId = chunkIds[1];
      const mappingGroupId = getMappingGroupId(firstChunkId);

      act(() => {
        addCondition(serializerId, mappingGroupId, firstChunkId);
      });

      const dmx = getDmx();
      const topLevelConditions = getConditionsForMappingGroup(
        dmx!,
        mappingGroupId,
      );
      expect(topLevelConditions.length).toBe(1);

      const groupCondition = topLevelConditions[0];
      expect(groupCondition.conditionType).toBe("group");
      expect(groupCondition.parent.type).toBe("mappingGroup");
      expect(groupCondition.parent.id).toBe(mappingGroupId);

      const children = getChildConditions(dmx!, groupCondition.id);
      expect(children.length).toBe(1);

      const childCondition = children[0];
      expect(childCondition.conditionType).toBe("chunkRef");
      expect(childCondition.parent.type).toBe("condition");
      expect(childCondition.parent.id).toBe(groupCondition.id);
      // The chunkRef should reference the other chunk, not the parent chunk
      if (childCondition.conditionType === "chunkRef") {
        expect(childCondition.chunkId).toBe(secondChunkId);
      }
    });

    test("adds chunkRef child to existing group when subsequent conditions are added", () => {
      act(() => {
        setupBasicDmxChunk();
        addDmxChunk(serializerId);
      });

      const dmx1 = getDmx();
      const chunkIds = Object.keys(dmx1!.chunks) as EntityId[];
      const firstChunkId = chunkIds[0];
      const mappingGroupId = getMappingGroupId(firstChunkId);

      act(() => {
        addCondition(serializerId, mappingGroupId, firstChunkId);
        addCondition(serializerId, mappingGroupId, firstChunkId);
      });

      const dmx = getDmx();
      const topLevelConditions = getConditionsForMappingGroup(
        dmx!,
        mappingGroupId,
      );
      // Should still only have one top-level group condition
      expect(topLevelConditions.length).toBe(1);

      const groupConditionId = topLevelConditions[0].id;
      const children = getChildConditions(dmx!, groupConditionId);
      // Should now have two chunkRef children
      expect(children.length).toBe(2);

      for (const child of children) {
        expect(child.conditionType).toBe("chunkRef");
        expect(child.parent.type).toBe("condition");
        expect(child.parent.id).toBe(groupConditionId);
      }
    });

    test("does not add condition when no other chunks exist to reference", () => {
      act(() => {
        setupBasicDmxChunk();
        // Only one chunk exists
      });

      const chunkId = getChunkId();
      const mappingGroupId = getMappingGroupId(chunkId);

      act(() => {
        addCondition(serializerId, mappingGroupId, chunkId);
      });

      const dmx = getDmx();
      expect(Object.keys(dmx!.conditions).length).toBe(0);
    });
  });

  describe("Modes", () => {
    const TAB_ID = "dmx-tab";

    function serializerIds(): EntityId[] {
      return Object.keys(getSerializers()) as EntityId[];
    }

    function modeIds(): string[] {
      return Object.values(getSerializers()).map((s) => s.codexId);
    }

    function tabSerializerId(): EntityId | undefined {
      return getHookValue(() => useTabDmxSerializerId(TAB_ID));
    }

    test("adds an empty read-only static mode named after the first free number", () => {
      act(() => {
        addDmxMode();
        changeDmxModeCodexId(serializerId, CodexId("basic"));
        addDmxMode();
      });

      expect(modeIds()).toEqual(["basic", "mode-2", "mode-1"]);
      expect(getSerializers()[serializerIds()[2]]).toEqual({
        codexId: "mode-1",
        access: ["read"],
        lifetime: "static",
        chunks: {},
        mappingGroups: {},
        conditions: {},
      });
    });

    test("a tab edits the first mode until another is selected", () => {
      act(() => {
        addDmxMode();
      });

      expect(tabSerializerId()).toBe(serializerId);

      act(() => {
        selectTabDmxSerializer(TAB_ID, serializerIds()[1]);
      });

      expect(tabSerializerId()).toBe(serializerIds()[1]);
      expect(getHookValue(() => useTabDmxSerializerId("other-tab"))).toBe(
        serializerId,
      );
    });

    test("a tab actively edits a mode after it is added", () => {
      act(() => {
        addDmxMode(TAB_ID);
      });

      expect(tabSerializerId()).toBe(serializerIds()[1]);
    });

    test("makes changes to the given mode only", () => {
      act(() => {
        addDmxMode();
      });
      const [first, second] = serializerIds();

      act(() => {
        addDmxChunk(first);
        addDmxChunk(second);
        addDmxChunk(second);
      });

      expect(Object.keys(getSerializers()[first].chunks)).toHaveLength(1);
      expect(Object.keys(getSerializers()[second].chunks)).toHaveLength(2);
    });

    test("a tab has no mode if there aren't any in the document", () => {
      act(() => {
        deleteDmxMode(serializerId);
      });

      expect(getSerializers()).toEqual({});
      expect(tabSerializerId()).toBeUndefined();
    });

    test("a tab falls back to the first mode when the one it is editing is deleted", () => {
      act(() => {
        addDmxMode(TAB_ID);
      });
      const [first, second] = serializerIds();

      act(() => {
        deleteDmxMode(second);
      });

      expect(serializerIds()).toEqual([first]);
      expect(tabSerializerId()).toBe(first);
    });

    test("duplicates a mode with all its data", () => {
      setupBasicDmxChunk();
      act(() => {
        addDmxChunk(serializerId);
      });
      const chunkId = getChunkId();
      const mappingGroupId = getMappingGroupId(chunkId);
      act(() => {
        addParameterMapping(serializerId, mappingGroupId);
        addCondition(serializerId, mappingGroupId, chunkId);
      });
      const original = getDmx()!;

      act(() => {
        duplicateDmxMode(serializerId, TAB_ID);
      });

      const [originalId, copyId] = serializerIds();
      const copy = getSerializers()[copyId];
      expect(getSerializers()[originalId]).toEqual(original);
      expect(tabSerializerId()).toBe(copyId);
      expect(copy.codexId).toBe("mode-2");

      // Nothing in the copy shares an ID with the original.
      for (const table of ["chunks", "mappingGroups", "conditions"] as const) {
        expect(Object.keys(copy[table])).toHaveLength(
          Object.keys(original[table]).length,
        );
        for (const id of Object.keys(copy[table])) {
          expect(original[table]).not.toHaveProperty(id);
        }
      }

      // The references inside the copy point at the copy's own entities.
      const copyChunkId = Object.entries(copy.chunks).find(
        ([, chunk]) => chunk.offsets[0] === original.chunks[chunkId].offsets[0],
      )![0] as EntityId;
      const [copyGroup] = getMappingGroupsForChunk(copy, copyChunkId);
      expect(copyGroup.mappings).toEqual(
        original.mappingGroups[mappingGroupId].mappings,
      );
      const [copyGroupCondition] = getConditionsForMappingGroup(
        copy,
        copyGroup.id,
      );
      const [copyChunkRef] = getChildConditions(copy, copyGroupCondition.id);
      if (copyChunkRef.conditionType !== "chunkRef") {
        throw new Error("Expected a chunk reference condition");
      }
      expect(copy.chunks).toHaveProperty(copyChunkRef.chunkId);
    });

    test("changes a mode's ID", () => {
      act(() => {
        changeDmxModeCodexId(serializerId, CodexId("extended"));
      });

      expect(modeIds()).toEqual(["extended"]);
    });
  });
});

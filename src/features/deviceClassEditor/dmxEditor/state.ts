import { DmxController } from "app/runtimeState";
import {
  DmxChunkRefCondition,
  DmxCondition,
  DmxConditionGroup,
  DmxMapping,
  DmxMappingGroup,
  DmxSerializerState,
  EntityId,
} from "app/persistentState";
import { updateCurrentEditor, useCurrentEditorPart } from "../state";
import { newEntityId, selectWithIds } from "app/stateUtils";
import { useAppRuntimeStore } from "app/store";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export function useDmxSerializer(): DmxSerializerState | undefined {
  return useCurrentEditorPart((state) => state.dmxSerializer);
}

export function useDmxController(): DmxController {
  return useAppRuntimeStore((state) => state.dmxController);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getOrCreateDmxSerializer(
  editor: Parameters<Parameters<typeof updateCurrentEditor>[0]>[0],
): DmxSerializerState {
  if (!editor.dmxSerializer) {
    editor.dmxSerializer = { chunks: {}, mappingGroups: {}, conditions: {} };
  }
  return editor.dmxSerializer;
}

export function getMappingGroupsForChunk(
  dmx: DmxSerializerState,
  chunkId: EntityId,
): (DmxMappingGroup & { id: EntityId })[] {
  return selectWithIds(dmx.mappingGroups, (mg) => mg.chunkId === chunkId).sort(
    (a, b) => a.index - b.index,
  );
}

export function getConditionsForMappingGroup(
  dmx: DmxSerializerState,
  mappingGroupId: EntityId,
): (DmxCondition & { id: EntityId })[] {
  return selectWithIds(
    dmx.conditions,
    (cond) =>
      cond.parent.type === "mappingGroup" && cond.parent.id === mappingGroupId,
  );
}

export function getChildConditions(
  dmx: DmxSerializerState,
  parentConditionId: EntityId,
): (DmxCondition & { id: EntityId })[] {
  return selectWithIds(
    dmx.conditions,
    (cond) =>
      cond.parent.type === "condition" && cond.parent.id === parentConditionId,
  );
}

// ---------------------------------------------------------------------------
// Write - Chunks
// ---------------------------------------------------------------------------

export function addDmxChunk() {
  updateCurrentEditor((editor) => {
    const dmx = getOrCreateDmxSerializer(editor);

    const offsetsInUse = Object.values(dmx.chunks).reduce((acc, chunk) => {
      acc.push(...chunk.offsets);
      return acc;
    }, [] as number[]);
    offsetsInUse.sort((a, b) => a - b);
    let lastOffset = -1;
    for (const offset of offsetsInUse) {
      if (offset - lastOffset > 1) {
        break;
      }
      lastOffset = offset;
    }

    const offsetToUse = lastOffset + 1;
    const newChunkId = newEntityId();

    dmx.chunks[newChunkId] = {
      offsets: [offsetToUse],
    };

    // Create a default mapping group for the new chunk
    const newMappingGroupId = newEntityId();
    dmx.mappingGroups[newMappingGroupId] = {
      chunkId: newChunkId,
      index: 0,
      mappings: [],
    };
  });
}

export function removeDmxChunk(chunkId: EntityId) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    // Find and remove all mapping groups for this chunk
    const mappingGroupIds = selectWithIds(
      dmx.mappingGroups,
      (mg) => mg.chunkId === chunkId,
    ).map((mg) => mg.id);

    for (const mgId of mappingGroupIds) {
      // Remove all conditions for this mapping group (and their children)
      removeConditionsForMappingGroup(dmx, mgId);
      delete dmx.mappingGroups[mgId];
    }

    // Also remove any conditions that reference this chunk
    const conditionsToRemove = selectWithIds(
      dmx.conditions,
      (cond) => cond.conditionType === "chunkRef" && cond.chunkId === chunkId,
    ).map((cond) => cond.id);

    for (const condId of conditionsToRemove) {
      removeConditionAndChildren(dmx, condId);
    }

    delete dmx.chunks[chunkId];
  });
}

function removeConditionsForMappingGroup(
  dmx: DmxSerializerState,
  mappingGroupId: EntityId,
) {
  const conditionIds = selectWithIds(
    dmx.conditions,
    (cond) =>
      cond.parent.type === "mappingGroup" && cond.parent.id === mappingGroupId,
  ).map((cond) => cond.id);

  for (const condId of conditionIds) {
    removeConditionAndChildren(dmx, condId);
  }
}

function removeConditionAndChildren(
  dmx: DmxSerializerState,
  conditionId: EntityId,
) {
  // First remove all children
  const childIds = selectWithIds(
    dmx.conditions,
    (cond) =>
      cond.parent.type === "condition" && cond.parent.id === conditionId,
  ).map((cond) => cond.id);

  for (const childId of childIds) {
    removeConditionAndChildren(dmx, childId);
  }

  delete dmx.conditions[conditionId];
}

export function changeDmxChunkOffsets(chunkId: EntityId, newOffsets: string[]) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    const chunk = dmx.chunks[chunkId];
    if (!chunk) return;

    try {
      const newOffsetsInt = newOffsets.map((o) => parseInt(o));
      for (const offset of newOffsetsInt) {
        if (offset < 0 || offset >= 512) {
          throw new Error("Invalid offset");
        }

        for (const [curChunkId, curChunk] of Object.entries(dmx.chunks)) {
          if (curChunkId !== chunkId && curChunk.offsets.includes(offset)) {
            throw new Error("Offset already in use");
          }
        }
      }

      chunk.offsets = [...new Set(newOffsetsInt)];
    } catch (e) {
      // TODO user feedback
      console.log(`Error adding DMX chunk: ${e}`);
      return;
    }
  });
}

// ---------------------------------------------------------------------------
// Write - Mapping Groups
// ---------------------------------------------------------------------------

export function addParameterMappingGroup(chunkId: EntityId) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx || !dmx.chunks[chunkId]) return;

    const existingGroups = getMappingGroupsForChunk(dmx, chunkId);
    const nextIndex =
      existingGroups.length > 0
        ? Math.max(...existingGroups.map((mg) => mg.index)) + 1
        : 0;

    const newMappingGroupId = newEntityId();
    dmx.mappingGroups[newMappingGroupId] = {
      chunkId,
      index: nextIndex,
      mappings: [],
    };
  });
}

export function removeParameterMappingGroup(
  chunkId: EntityId,
  mappingGroupId: EntityId,
) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    const mg = dmx.mappingGroups[mappingGroupId];
    if (!mg || mg.chunkId !== chunkId) return;

    // Remove all conditions for this mapping group
    removeConditionsForMappingGroup(dmx, mappingGroupId);

    delete dmx.mappingGroups[mappingGroupId];
  });
}

// ---------------------------------------------------------------------------
// Write - Parameter Mappings
// ---------------------------------------------------------------------------

export function addParameterMapping(mappingGroupId: EntityId) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    const mappingGroup = dmx.mappingGroups[mappingGroupId];
    if (!mappingGroup) return;

    const firstParam = Object.values(editor.parameters)[0];
    if (!firstParam) return;

    const mappedParam =
      firstParam.count !== undefined && firstParam.count > 1
        ? { codexId: firstParam.codexId, index: 0 }
        : { codexId: firstParam.codexId };

    mappingGroup.mappings.push({
      mappedParam,
      ranges: [],
    });
  });
}

export function updateParameterMapping(
  mappingGroupId: EntityId,
  mappingIndex: number,
  newValue: DmxMapping,
) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    const mappingGroup = dmx.mappingGroups[mappingGroupId];
    if (!mappingGroup) return;

    mappingGroup.mappings[mappingIndex] = newValue;
  });
}

export function removeParameterMapping(
  mappingGroupId: EntityId,
  mappingIndex: number,
) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    const mappingGroup = dmx.mappingGroups[mappingGroupId];
    if (!mappingGroup) return;

    mappingGroup.mappings.splice(mappingIndex, 1);
  });
}

// ---------------------------------------------------------------------------
// Write - Conditions
// ---------------------------------------------------------------------------

export function addCondition(
  mappingGroupId: EntityId,
  parentChunkId: EntityId,
) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    const mappingGroup = dmx.mappingGroups[mappingGroupId];
    if (!mappingGroup) return;

    // Find another chunk to reference (can't reference our own chunk)
    const otherChunkIds = Object.keys(dmx.chunks).filter(
      (id) => id !== parentChunkId,
    ) as EntityId[];

    if (otherChunkIds.length === 0) return;

    // Check if there's already a top-level group condition for this mapping group
    const existingConditions = getConditionsForMappingGroup(
      dmx,
      mappingGroupId,
    );

    if (existingConditions.length === 0) {
      // No conditions yet - create a group with one chunkRef child
      const groupConditionId = newEntityId();
      const chunkRefConditionId = newEntityId();

      const groupCondition: DmxConditionGroup = {
        conditionType: "group",
        parent: { type: "mappingGroup", id: mappingGroupId },
        match: "any",
      };

      const chunkRefCondition: DmxChunkRefCondition = {
        conditionType: "chunkRef",
        parent: { type: "condition", id: groupConditionId },
        chunkId: otherChunkIds[0],
        chunkStart: 0,
        chunkEnd: 255,
      };

      dmx.conditions[groupConditionId] = groupCondition;
      dmx.conditions[chunkRefConditionId] = chunkRefCondition;
    } else {
      // Find the group condition and add a new child to it
      const groupConditionWithId = existingConditions.find(
        (cond) => cond.conditionType === "group",
      );

      if (groupConditionWithId) {
        const chunkRefConditionId = newEntityId();
        const chunkRefCondition: DmxChunkRefCondition = {
          conditionType: "chunkRef",
          parent: { type: "condition", id: groupConditionWithId.id },
          chunkId: otherChunkIds[0],
          chunkStart: 0,
          chunkEnd: 255,
        };
        dmx.conditions[chunkRefConditionId] = chunkRefCondition;
      }
    }
  });
}

export function updateCondition(
  conditionId: EntityId,
  newCondition: DmxCondition,
) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    if (!dmx.conditions[conditionId]) return;

    dmx.conditions[conditionId] = newCondition;
  });
}

export function updateConditionMatch(
  conditionId: EntityId,
  match: "any" | "all",
) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    const condition = dmx.conditions[conditionId];
    if (!condition || condition.conditionType !== "group") return;

    condition.match = match;
  });
}

export function removeCondition(conditionId: EntityId) {
  updateCurrentEditor((editor) => {
    const dmx = editor.dmxSerializer;
    if (!dmx) return;

    removeConditionAndChildren(dmx, conditionId);
  });
}

import { createContext, useContext, useMemo } from "react";
import { current } from "immer";
import { MessageDescriptor } from "@lingui/core";
import { i18n } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { DmxController } from "app/runtimeState";
import {
  CodexId,
  DmxChunkRefCondition,
  DmxCondition,
  DmxConditionGroup,
  DmxMapping,
  DmxMappingGroup,
  DmxSerializer,
  EntityId,
  fcDataTypes,
  Parameter,
} from "app/persistentState";
import {
  DeviceClassDraft,
  updateCurrentEditor,
  useCurrentEditorId,
  useCurrentEditorPart,
  useDeviceLibrary,
  useLibraries,
  useSourceLocale,
} from "../state";
import { newEntityId, selectWithIds } from "app/stateUtils";
import {
  updateAppRuntimeState,
  useAppRuntimeStore,
  useLibraryStore,
  useAuthoringLocale,
} from "app/store";
import {
  lookupParameterClass,
  ResolvedParameterClass,
  LocalizedInstanceEnumChoice,
} from "../stateTransformations";
import { resolveClassRef } from "../classResolution";
import { EffectiveEnumChoice, getEffectiveEnumChoices } from "./mappingUtils";
import { localize } from "features/localizations/localize";
import { ItemEditor } from "utils/utils";
import {
  copyDmxSerializer,
  newDmxSerializer,
  nextModeCodexId,
  resolveDmxSerializerId,
} from "./modes";

const UNDO = {
  addMode: msg({
    id: "deviceClassEditor.dmx.undo.addMode",
    message: "Add DMX Mode",
  }),
  duplicateMode: msg({
    id: "deviceClassEditor.dmx.undo.duplicateMode",
    message: "Duplicate DMX Mode",
  }),
  deleteMode: msg({
    id: "deviceClassEditor.dmx.undo.deleteMode",
    message: "Delete DMX Mode",
  }),
  changeModeId: msg({
    id: "deviceClassEditor.dmx.undo.changeModeId",
    message: "Change DMX Mode ID",
  }),
  addChunk: msg({
    id: "deviceClassEditor.dmx.undo.addChunk",
    message: "Add DMX Chunk",
  }),
  deleteChunk: msg({
    id: "deviceClassEditor.dmx.undo.deleteChunk",
    message: "Delete DMX Chunk",
  }),
  changeOffsets: msg({
    id: "deviceClassEditor.dmx.undo.changeOffsets",
    message: "Change DMX Offsets",
  }),
  addMappingGroup: msg({
    id: "deviceClassEditor.dmx.undo.addMappingGroup",
    message: "Add DMX Mapping Group",
  }),
  deleteMappingGroup: msg({
    id: "deviceClassEditor.dmx.undo.deleteMappingGroup",
    message: "Delete DMX Mapping Group",
  }),
  addParameterMapping: msg({
    id: "deviceClassEditor.dmx.undo.addParameterMapping",
    message: "Add DMX Parameter Mapping",
  }),
  editParameterMapping: msg({
    id: "deviceClassEditor.dmx.undo.editParameterMapping",
    message: "Edit DMX Parameter Mapping",
  }),
  deleteParameterMapping: msg({
    id: "deviceClassEditor.dmx.undo.deleteParameterMapping",
    message: "Delete DMX Parameter Mapping",
  }),
  addMappingCondition: msg({
    id: "deviceClassEditor.dmx.undo.addMappingCondition",
    message: "Add DMX Mapping Condition",
  }),
  editMappingCondition: msg({
    id: "deviceClassEditor.dmx.undo.editMappingCondition",
    message: "Edit DMX Mapping Condition",
  }),
  deleteMappingCondition: msg({
    id: "deviceClassEditor.dmx.undo.deleteMappingCondition",
    message: "Delete DMX Mapping Condition",
  }),
};

/** Data types that can be mapped to DMX values */
export type MappableDataType =
  | typeof fcDataTypes.NUMBER
  | typeof fcDataTypes.BOOLEAN
  | typeof fcDataTypes.ENUM;

/** ResolvedParameterClass narrowed to only mappable data types */
export interface MappableParameterClass
  extends Omit<ResolvedParameterClass, "dataType"> {
  dataType: MappableDataType;
}

export interface MappableParameter {
  param: Parameter;
  paramClass: MappableParameterClass;
  entityId: EntityId;
  enumChoices: EffectiveEnumChoice[];
  friendlyName?: string;
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export interface DmxMode {
  id: EntityId;
  codexId: CodexId;
}

export function useDmxModes(): DmxMode[] {
  const serializers = useCurrentEditorPart((editor) => editor.dmxSerializers);

  return useMemo(
    () =>
      Object.entries(serializers ?? {}).map(([id, serializer]) => ({
        id: EntityId(id),
        codexId: serializer.codexId,
      })),
    [serializers],
  );
}

/**
 * The ID of the serializer a DMX editor tab is editing. undefined if the
 * document has no serializers.
 */
export function useTabDmxSerializerId(tabId: string): EntityId | undefined {
  const selectedId = useAppRuntimeStore(
    (state) => state.dmxEditorSerializers[tabId],
  );
  return useCurrentEditorPart((editor) =>
    resolveDmxSerializerId(editor.dmxSerializers, selectedId),
  );
}

/**
 * Context for DMX editor components - provides the serializer that is
 * currently being edited.
 */
export const EditedDmxSerializerContext = createContext<EntityId | undefined>(
  undefined,
);

/** The ID of the serializer that the enclosing DMX editor is editing. */
export function useEditedDmxSerializerId(): EntityId {
  const id = useContext(EditedDmxSerializerContext);
  if (id === undefined) {
    throw new Error("No DMX serializer is being edited here");
  }
  return id;
}

/** The serializer that the enclosing DMX editor is editing. */
export function useDmxSerializer(): DmxSerializer | undefined {
  const id = useContext(EditedDmxSerializerContext);
  return useCurrentEditorPart((editor) =>
    id ? editor.dmxSerializers[id] : undefined,
  );
}

const CHUNK_LABEL = msg({
  id: "deviceClassEditor.dmxChunk.slotLabel",
  message: "Slot {offsets}",
});

export function dmxChunkLabel(offsets: number[]): string {
  return i18n._({ ...CHUNK_LABEL, values: { offsets: offsets.join(", ") } });
}

export function useDmxChunkEditors(): ItemEditor[] {
  const chunks = useDmxSerializer()?.chunks;

  return useMemo(() => {
    const chunkEditors = Object.entries(chunks ?? {}).map(([id, chunk]) => ({
      id: EntityId(id),
      codexId: CodexId(dmxChunkLabel(chunk.offsets)),
      firstOffset: chunk.offsets[0] ?? Infinity,
    }));

    chunkEditors.sort((a, b) => a.firstOffset - b.firstOffset);

    return chunkEditors.map(({ id, codexId }) => ({ id, codexId }));
  }, [chunks]);
}

/** The DMX test driver built from the document being edited, if it has one. */
export function useDmxController(): DmxController {
  const editorId = useCurrentEditorId();
  return useAppRuntimeStore(
    (state) =>
      (editorId ? state.dmxControllers[editorId] : undefined) ?? NO_CONTROLLER,
  );
}

const NO_CONTROLLER: DmxController = { state: "not-created" };

/**
 * Hook that returns parameters that can be mapped to DMX.
 * Filters to only number/boolean/enum data types and computes effective enum choices.
 */
export function useMappableParameters(): Record<EntityId, MappableParameter> {
  const locale = useAuthoringLocale();
  const sourceLocale = useSourceLocale();
  const libraryStore = useLibraryStore();
  const importedLibs = useLibraries();
  const deviceLibrary = useDeviceLibrary();
  const parameters = useCurrentEditorPart((editor) => editor.parameters);

  if (!deviceLibrary || !importedLibs || !parameters) return {};

  const { enumChoices, localizations } = deviceLibrary;

  return Object.entries(parameters).reduce(
    (acc, [entityId, param]) => {
      const resolved = resolveClassRef(
        param.class,
        importedLibs,
        deviceLibrary,
        libraryStore,
        "parameterClasses",
      );
      const paramClass: ResolvedParameterClass | undefined = resolved
        ? lookupParameterClass(resolved, locale, sourceLocale)
        : undefined;

      if (!paramClass || !isMappableParamClass(paramClass)) {
        return acc;
      }

      // Compute instance enum choices for this parameter
      const instanceChoices = selectWithIds(
        enumChoices,
        (choice) =>
          choice.parent.type === "paramAdditional" &&
          choice.parent.id === entityId,
      );
      instanceChoices.sort((a, b) => a.index - b.index);

      const localizedInstanceChoices: LocalizedInstanceEnumChoice[] =
        instanceChoices.map((choice) => ({
          id: choice.id,
          codexId: choice.codexId,
          index: choice.index,
          name: localize(
            localizations,
            choice.localized.name,
            locale,
            sourceLocale,
          ),
          description: choice.localized.description
            ? localize(
                localizations,
                choice.localized.description,
                locale,
                sourceLocale,
              )
            : undefined,
        }));

      // Compute effective enum choices (class + instance - exclusions)
      const effectiveEnumChoices = getEffectiveEnumChoices(
        paramClass.choices,
        localizedInstanceChoices,
        param.enumExclusions,
      );

      acc[EntityId(entityId)] = {
        param,
        paramClass,
        entityId: EntityId(entityId),
        enumChoices: effectiveEnumChoices,
        friendlyName: param.localized.friendlyName
          ? localize(
              localizations,
              param.localized.friendlyName,
              locale,
              sourceLocale,
            ).value
          : undefined,
      };

      return acc;
    },
    {} as Record<EntityId, MappableParameter>,
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateDmxSerializer(
  serializerId: EntityId,
  label: MessageDescriptor,
  updater: (dmx: DmxSerializer, editor: DeviceClassDraft) => void,
) {
  updateCurrentEditor(label, (editor) => {
    const dmx = editor.dmxSerializers[serializerId];
    if (dmx) {
      updater(dmx, editor);
    }
  });
}

export function getMappingGroupsForChunk(
  dmx: DmxSerializer,
  chunkId: EntityId,
): (DmxMappingGroup & { id: EntityId })[] {
  return selectWithIds(dmx.mappingGroups, (mg) => mg.chunkId === chunkId).sort(
    (a, b) => a.index - b.index,
  );
}

export function getConditionsForMappingGroup(
  dmx: DmxSerializer,
  mappingGroupId: EntityId,
): (DmxCondition & { id: EntityId })[] {
  return selectWithIds(
    dmx.conditions,
    (cond) =>
      cond.parent.type === "mappingGroup" && cond.parent.id === mappingGroupId,
  );
}

export function getChildConditions(
  dmx: DmxSerializer,
  parentConditionId: EntityId,
): (DmxCondition & { id: EntityId })[] {
  return selectWithIds(
    dmx.conditions,
    (cond) =>
      cond.parent.type === "condition" && cond.parent.id === parentConditionId,
  );
}

function isMappableParamClass(
  paramClass: ResolvedParameterClass,
): paramClass is MappableParameterClass {
  return (
    paramClass.dataType === fcDataTypes.NUMBER ||
    paramClass.dataType === fcDataTypes.BOOLEAN ||
    paramClass.dataType === fcDataTypes.ENUM
  );
}

// ---------------------------------------------------------------------------
// Write - Chunks
// ---------------------------------------------------------------------------

export function addDmxChunk(serializerId: EntityId) {
  updateDmxSerializer(serializerId, UNDO.addChunk, (dmx) => {
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
      triggers: [],
    };
  });
}

export function removeDmxChunk(serializerId: EntityId, chunkId: EntityId) {
  updateDmxSerializer(serializerId, UNDO.deleteChunk, (dmx) => {
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
  dmx: DmxSerializer,
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

function removeConditionAndChildren(dmx: DmxSerializer, conditionId: EntityId) {
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

export function changeDmxChunkOffsets(
  serializerId: EntityId,
  chunkId: EntityId,
  newOffsets: string[],
) {
  updateDmxSerializer(serializerId, UNDO.changeOffsets, (dmx) => {
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

export function addParameterMappingGroup(
  serializerId: EntityId,
  chunkId: EntityId,
) {
  updateDmxSerializer(serializerId, UNDO.addMappingGroup, (dmx) => {
    if (!dmx.chunks[chunkId]) return;

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
      triggers: [],
    };
  });
}

export function removeParameterMappingGroup(
  serializerId: EntityId,
  chunkId: EntityId,
  mappingGroupId: EntityId,
) {
  updateDmxSerializer(serializerId, UNDO.deleteMappingGroup, (dmx) => {
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

export function addParameterMapping(
  serializerId: EntityId,
  mappingGroupId: EntityId,
) {
  updateDmxSerializer(serializerId, UNDO.addParameterMapping, (dmx, editor) => {
    const mappingGroup = dmx.mappingGroups[mappingGroupId];
    if (!mappingGroup) return;

    const firstEntry = Object.entries(editor.parameters)[0];
    if (!firstEntry) return;
    const [firstParamId, firstParam] = firstEntry;

    const countValue =
      firstParam.count?.type === "fixed" ? firstParam.count.value : undefined;
    const mappedParam =
      countValue !== undefined && countValue > 1
        ? { id: EntityId(firstParamId), index: 0 }
        : { id: EntityId(firstParamId) };

    mappingGroup.mappings.push({
      mappedParam,
      ranges: [],
    });
  });
}

export function updateParameterMapping(
  serializerId: EntityId,
  mappingGroupId: EntityId,
  mappingIndex: number,
  newValue: DmxMapping,
) {
  updateDmxSerializer(serializerId, UNDO.editParameterMapping, (dmx) => {
    const mappingGroup = dmx.mappingGroups[mappingGroupId];
    if (!mappingGroup) return;

    mappingGroup.mappings[mappingIndex] = newValue;
  });
}

export function removeParameterMapping(
  serializerId: EntityId,
  mappingGroupId: EntityId,
  mappingIndex: number,
) {
  updateDmxSerializer(serializerId, UNDO.deleteParameterMapping, (dmx) => {
    const mappingGroup = dmx.mappingGroups[mappingGroupId];
    if (!mappingGroup) return;

    mappingGroup.mappings.splice(mappingIndex, 1);
  });
}

// ---------------------------------------------------------------------------
// Write - Conditions
// ---------------------------------------------------------------------------

export function addCondition(
  serializerId: EntityId,
  mappingGroupId: EntityId,
  parentChunkId: EntityId,
) {
  updateDmxSerializer(serializerId, UNDO.addMappingCondition, (dmx) => {
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
  serializerId: EntityId,
  conditionId: EntityId,
  newCondition: DmxCondition,
) {
  updateDmxSerializer(serializerId, UNDO.editMappingCondition, (dmx) => {
    if (!dmx.conditions[conditionId]) return;

    dmx.conditions[conditionId] = newCondition;
  });
}

export function updateConditionMatch(
  serializerId: EntityId,
  conditionId: EntityId,
  match: "any" | "all",
) {
  updateDmxSerializer(serializerId, UNDO.editMappingCondition, (dmx) => {
    const condition = dmx.conditions[conditionId];
    if (!condition || condition.conditionType !== "group") return;

    condition.match = match;
  });
}

export function removeCondition(serializerId: EntityId, conditionId: EntityId) {
  updateDmxSerializer(serializerId, UNDO.deleteMappingCondition, (dmx) => {
    removeConditionAndChildren(dmx, conditionId);
  });
}

// ---------------------------------------------------------------------------
// Write - Modes
// ---------------------------------------------------------------------------

/** Selects the serializer that a DMX editor tab is editing. */
export function selectTabDmxSerializer(tabId: string, serializerId: EntityId) {
  updateAppRuntimeState((state) => {
    state.dmxEditorSerializers[tabId] = serializerId;
  });
}

/** Adds an empty mode to the document. */
export function addDmxMode(tabId?: string) {
  addDmxSerializer(UNDO.addMode, tabId, (editor) =>
    newDmxSerializer(nextModeCodexId(editor.dmxSerializers)),
  );
}

/** Adds a copy of a mode to the document. */
export function duplicateDmxMode(serializerId: EntityId, tabId?: string) {
  addDmxSerializer(UNDO.duplicateMode, tabId, (editor) => {
    const original = editor.dmxSerializers[serializerId];
    if (!original) return undefined;

    return copyDmxSerializer(
      current(original),
      nextModeCodexId(editor.dmxSerializers),
    );
  });
}

export function deleteDmxMode(serializerId: EntityId) {
  updateCurrentEditor(UNDO.deleteMode, (editor) => {
    delete editor.dmxSerializers[serializerId];
  });
}

export function changeDmxModeCodexId(serializerId: EntityId, codexId: CodexId) {
  updateCurrentEditor(UNDO.changeModeId, (editor) => {
    const serializer = editor.dmxSerializers[serializerId];
    if (serializer) {
      serializer.codexId = codexId;
    }
  });
}

function addDmxSerializer(
  label: MessageDescriptor,
  tabId: string | undefined,
  create: (editor: DeviceClassDraft) => DmxSerializer | undefined,
) {
  const id = newEntityId();
  let added = false;
  updateCurrentEditor(label, (editor) => {
    const serializer = create(editor);
    if (serializer) {
      editor.dmxSerializers[id] = serializer;
      added = true;
    }
  });

  if (added && tabId !== undefined) {
    selectTabDmxSerializer(tabId, id);
  }
}

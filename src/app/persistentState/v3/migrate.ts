import * as V2 from "../v2/state";
import * as V3 from "./state";

/**
 * Coerces a number to a non-negative integer suitable for V3 ParameterCount.
 * - Negative values are clamped to 0
 * - Fractional values are truncated toward zero
 */
function toNonNegativeInt(value: number): number {
  return Math.max(0, Math.trunc(value));
}

/**
 * Migrates the V2 parameter count fields (count, dynamicMinimum, dynamicMaximum)
 * to the V3 ParameterCount discriminated union.
 */
export function migrateParameterCount(
  count: number | undefined,
  dynamicMinimum: number | undefined,
  dynamicMaximum: number | undefined,
): V3.ParameterCount | undefined {
  // Fixed count takes precedence (count is already validated as int by V2 schema)
  if (count !== undefined) {
    return { type: "fixed", value: count };
  }

  // Dynamic count: at least one of min/max must be defined
  if (dynamicMinimum !== undefined || dynamicMaximum !== undefined) {
    const min = toNonNegativeInt(dynamicMinimum ?? 0);
    const max =
      dynamicMaximum !== undefined
        ? toNonNegativeInt(dynamicMaximum)
        : undefined;

    // Ensure min <= max if both are defined
    if (max !== undefined && min > max) {
      return { type: "dynamic", min: max, max: min };
    }

    return { type: "dynamic", min, max };
  }

  return undefined;
}

/**
 * Migrates a V2 DmxMappingRange to V3 format.
 * V2 had chunkStart/chunkEnd directly on the object.
 * V3 wraps them in a chunkValues discriminated union.
 */
function migrateMappingRange(range: V2.DmxMappingRange): V3.DmxMappingRange {
  return {
    start: range.start,
    end: range.end,
    chunkValues: {
      type: "range",
      chunkStart: range.chunkStart,
      chunkEnd: range.chunkEnd,
    },
  };
}

/**
 * Migrates a V2 DmxMapping to V3 format.
 */
function migrateMapping(mapping: V2.DmxMapping): V3.DmxMapping {
  return {
    ...mapping,
    ranges: mapping.ranges.map(migrateMappingRange),
  };
}

/**
 * Migrates a V2 DmxMappingGroup to V3 format.
 * V3 adds a triggers array (empty for migrated data).
 */
function migrateMappingGroup(group: V2.DmxMappingGroup): V3.DmxMappingGroup {
  return {
    ...group,
    mappings: group.mappings.map(migrateMapping),
    triggers: [],
  };
}

/**
 * Migrates a V2 DmxSerializerState to V3 format.
 */
function migrateDmxSerializer(
  dmx: V2.DmxSerializerState,
): V3.DmxSerializerState {
  const migratedMappingGroups: Record<V3.EntityId, V3.DmxMappingGroup> = {};

  for (const [groupId, group] of Object.entries(dmx.mappingGroups)) {
    migratedMappingGroups[groupId as V3.EntityId] = migrateMappingGroup(group);
  }

  return {
    chunks: dmx.chunks,
    mappingGroups: migratedMappingGroups,
    conditions: dmx.conditions,
  };
}

/**
 * Migrates a V2 Parameter to V3 format.
 */
function migrateParameter(param: V2.Parameter): V3.Parameter {
  const { dynamicMinimum, dynamicMaximum, count, ...restParam } = param;
  return {
    ...restParam,
    count: migrateParameterCount(count, dynamicMinimum, dynamicMaximum),
  };
}

/**
 * Migrates state from V2 to V3.
 *
 * Changes:
 * - Parameter count, dynamicMinimum and dynamicMaximum are collapsed into 'count' discriminated union
 * - deviceClassEditors now keyed properly by EntityId
 * - DmxMappingRange: chunkStart/chunkEnd moved into chunkValues discriminated union where we also
 *   add support for sequences
 * - DmxMappingGroup: added triggers array
 */
export function migrateV2toV3(
  state: V2.AppPersistentState,
): V3.AppPersistentState {
  const migratedEditors: Record<V3.EntityId, V3.DeviceClassEditorState> = {};

  for (const [editorKey, editor] of Object.entries(state.deviceClassEditors)) {
    const migratedParameters: Record<V3.EntityId, V3.Parameter> = {};

    for (const [paramId, param] of Object.entries(editor.parameters)) {
      migratedParameters[paramId as V3.EntityId] = migrateParameter(param);
    }

    migratedEditors[editorKey as V3.EntityId] = {
      ...editor,
      parameters: migratedParameters,
      dmxSerializer: editor.dmxSerializer
        ? migrateDmxSerializer(editor.dmxSerializer)
        : undefined,
    };
  }

  return {
    ...state,
    deviceClassEditors: migratedEditors,
  };
}

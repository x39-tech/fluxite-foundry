// DMX serializers are called "modes" in the UI.

import { CodexId, DmxSerializer, EntityId } from "app/persistentState";
import { newEntityId } from "app/stateUtils";

/**
 * The serializer that a selection refers to. Returns the first serializer in
 * the document if the ID is not present. Returns undefined only when the
 * document has no serializers.
 */
export function resolveDmxSerializerId(
  serializers: Record<EntityId, DmxSerializer>,
  selectedId: EntityId | undefined,
): EntityId | undefined {
  if (selectedId !== undefined && selectedId in serializers) {
    return selectedId;
  }
  return Object.keys(serializers)[0] as EntityId | undefined;
}

export function nextModeCodexId(
  serializers: Record<EntityId, DmxSerializer>,
): CodexId {
  const inUse = new Set<string>(
    Object.values(serializers).map((serializer) => serializer.codexId),
  );
  for (let number = 1; ; number++) {
    const codexId = `mode-${number}`;
    if (!inUse.has(codexId)) {
      return CodexId(codexId);
    }
  }
}

export function newDmxSerializer(codexId: CodexId): DmxSerializer {
  return {
    codexId,
    access: ["read"],
    lifetime: "static",
    chunks: {},
    mappingGroups: {},
    conditions: {},
  };
}

/**
 * Make a deep copy of a serializer - this requires creating new entity IDs for
 * things like chunks, mapping groups and conditions, and the references
 * between them are updated.
 */
export function copyDmxSerializer(
  serializer: DmxSerializer,
  codexId: CodexId,
): DmxSerializer {
  const copy = structuredClone(serializer);
  const chunkIds = newIdsFor(copy.chunks);
  const mappingGroupIds = newIdsFor(copy.mappingGroups);
  const conditionIds = newIdsFor(copy.conditions);

  const mappingGroups = rekey(copy.mappingGroups, mappingGroupIds);
  for (const mappingGroup of Object.values(mappingGroups)) {
    mappingGroup.chunkId = remap(chunkIds, mappingGroup.chunkId);
  }

  const conditions = rekey(copy.conditions, conditionIds);
  for (const condition of Object.values(conditions)) {
    condition.parent.id = remap(
      condition.parent.type === "mappingGroup" ? mappingGroupIds : conditionIds,
      condition.parent.id,
    );
    if (condition.conditionType === "chunkRef") {
      condition.chunkId = remap(chunkIds, condition.chunkId);
    }
  }

  return {
    ...copy,
    codexId,
    chunks: rekey(copy.chunks, chunkIds),
    mappingGroups,
    conditions,
  };
}

function newIdsFor(table: Record<EntityId, unknown>): Map<EntityId, EntityId> {
  return new Map(
    Object.keys(table).map((id) => [EntityId(id), newEntityId()] as const),
  );
}

// A reference to an entity that is not in the table is left as it was.
function remap(newIds: Map<EntityId, EntityId>, id: EntityId): EntityId {
  return newIds.get(id) ?? id;
}

function rekey<T>(
  table: Record<EntityId, T>,
  newIds: Map<EntityId, EntityId>,
): Record<EntityId, T> {
  return Object.fromEntries(
    Object.entries(table).map(([id, value]) => [
      remap(newIds, EntityId(id)),
      value,
    ]),
  ) as Record<EntityId, T>;
}

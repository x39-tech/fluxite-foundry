import { nanoid } from "nanoid";
import { EntityId, EnumChoiceParent, LocalizationKey } from "./persistentState";

export function enumChoiceParentsEqual(
  a: EnumChoiceParent,
  b: EnumChoiceParent,
) {
  if (a.type !== b.type) return false;
  if (a.id !== b.id) return false;

  if (a.type === "cmdArg" || a.type === "cmdRet") {
    return b.type === a.type && a.idType === b.idType && a.cmdId === b.cmdId;
  }

  return true;
}

export function newEntityId(): EntityId {
  return EntityId(nanoid());
}

export function optionalLocalizationKey(
  id: string | undefined,
): LocalizationKey | undefined {
  return id as LocalizationKey;
}

// Database-like queries on record types
export function select<T>(
  table: Record<EntityId, T>,
  where: (item: T) => boolean,
): T[] {
  return Object.values(table).filter(where);
}

export function selectWithIds<T>(
  table: Record<EntityId, T>,
  where: (item: T) => boolean,
): (T & { id: EntityId })[] {
  return Object.entries(table)
    .filter(([_, val]) => where(val))
    .map(([id, val]) => {
      return {
        ...val,
        id: EntityId(id),
      };
    });
}

export function get<T>(
  table: Record<EntityId, T>,
  where: (item: T) => boolean,
): T | undefined {
  return Object.values(table).find(where);
}

export function getWithId<T>(
  table: Record<EntityId, T>,
  where: (item: T) => boolean,
): (T & { id: EntityId }) | undefined {
  const res = Object.entries(table).find(([_, val]) => where(val));
  if (!res) {
    return undefined;
  }

  return {
    ...res[1],
    id: EntityId(res[0]),
  };
}

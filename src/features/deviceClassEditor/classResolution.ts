// Resolves a stored ClassReference to the library that holds the class and the
// EntityId it has in that library.

import {
  LocalOrImportedId,
  ClassReference,
  CodexId,
  EntityId,
} from "app/persistentState";
import {
  ClassKind,
  Library,
  LibraryIndex,
  LibraryStore,
  MemberKind,
} from "codex/library";

export interface ResolvedClassRef {
  library: Library;
  classId: EntityId;
  // Absent for the device library, whose stored ids are already EntityIds.
  // Its presence is also what makes a resolved reference "imported": member
  // ids stored against an imported class are CodexIds.
  index?: LibraryIndex;
}

export function resolveClassRef(
  classRef: ClassReference,
  importedLibraries: Record<string, string>,
  deviceLibrary: Library,
  store: Readonly<LibraryStore>,
  kind: ClassKind,
): ResolvedClassRef | undefined {
  if (classRef.type === "local") {
    return { library: deviceLibrary, classId: classRef.id };
  }

  const version = importedLibraries[classRef.library];
  if (!version) {
    return undefined;
  }

  const imported = store[classRef.library]?.[version];
  if (!imported) {
    return undefined;
  }

  const classId = imported.index[kind].get(classRef.codexId);
  if (!classId) {
    return undefined;
  }

  return { library: imported.library, classId, index: imported.index };
}

// Maps a stored LocalOrImportedId into the resolved library's EntityId space.
// `ownerId` is the EntityId of the sub-item's parent: the command class for
// arguments and return values, the parameter class / argument / return value
// for enum choices.
export function resolveMemberId(
  resolved: ResolvedClassRef,
  kind: MemberKind,
  ownerId: EntityId,
  member: LocalOrImportedId,
): EntityId | undefined {
  if (!resolved.index) {
    // A member of a local class is stored as its EntityId already.
    return member as EntityId;
  }

  return resolved.index[kind].get(ownerId)?.get(member as CodexId);
}

// Provides a context for injecting generic class editors into a document editor
// that works with classes (either a Device Class Editor or a Library Editor).

import { createContext, ReactNode, useContext } from "react";
import { Draft } from "immer";
import { CodexId, EntityId, LocalizationKey } from "app/persistentState";
import { ClassKind as ReferenceableClassKind, Library } from "codex/library";

export type { ReferenceableClassKind };

// The document surface the class editors need.
export interface ClassDocument extends Library {
  sourceLocale: string;
}

// The tables of classes a document owns, and which the editors can work with.
export const classKinds = {
  PARAMETER: "parameterClasses",
  STRUCTURE: "structureClasses",
  SERIALIZER: "serializerClasses",
  RESOURCE: "resourceClasses",
  COMMAND: "commandClasses",
} as const;

export type ClassKind = (typeof classKinds)[keyof typeof classKinds];

// Structure and serializer classes have no instance table pointing at them, so
// only the other three can be held open against deletion.
export function isReferenceableKind(
  kind: ClassKind,
): kind is ReferenceableClassKind {
  return kind !== classKinds.STRUCTURE && kind !== classKinds.SERIALIZER;
}

// Every table a class or a part of one lives in.
export type ClassTableKey =
  | ClassKind
  | "commandClassArguments"
  | "commandClassReturnValues"
  | "enumChoices";

/** The localized fields every class and class member carries. */
export interface ClassLocalizedValues {
  name: string;
  description?: string;
}

export interface ClassLocalizedKeys {
  name: LocalizationKey;
  description?: LocalizationKey;
}

export type ClassLocalizedField = keyof ClassLocalizedValues;

/** Creates, edits and removes the localized strings of classes. */
export interface ClassLocalizer {
  create(
    table: ClassTableKey,
    values: ClassLocalizedValues,
    locale: string,
  ): ClassLocalizedKeys;

  set(
    table: ClassTableKey,
    entityId: EntityId,
    field: ClassLocalizedField,
    value: string,
    locale: string,
  ): void;

  remove(refs: { table: ClassTableKey; entityId: EntityId }[]): void;
}

export interface ClassEditingApi {
  /** The classes to edit, in the app's normalized form. */
  useLibrary(): Library | undefined;

  /** The locale the document was authored in. */
  useSourceLocale(): string | undefined;

  /**
   * The codexIds of the items that reference this class. Used to determine
   * behavior on attempting to delete a class. A document with no instances
   * returns an empty array.
   */
  getClassUsage(kind: ReferenceableClassKind, classId: EntityId): CodexId[];

  /** Applies one change. The label names it in the undo menu. */
  update(
    label: string,
    recipe: (draft: Draft<ClassDocument>, localizer: ClassLocalizer) => void,
  ): void;
}

const ClassEditingContext = createContext<ClassEditingApi | undefined>(
  undefined,
);

interface ProviderProps {
  api: ClassEditingApi;
  children: ReactNode;
}

/**
 * A context to place around a ClassesEditor.
 *
 * `api` should be a constant containing stable references to hooks and global
 * functions.
 */
export const ClassEditingProvider = ({ api, children }: ProviderProps) => {
  return (
    <ClassEditingContext.Provider value={api}>
      {children}
    </ClassEditingContext.Provider>
  );
};

export function useClassEditing(): ClassEditingApi {
  const api = useContext(ClassEditingContext);
  if (!api) {
    throw new Error(
      "Class editors must be rendered inside a ClassEditingProvider.",
    );
  }
  return api;
}

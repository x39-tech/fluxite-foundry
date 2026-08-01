/** Types used in localization of data edited by this app. */

import {
  EntityId,
  Localization,
  LocalizationKey,
  LocalizationReferencedItem,
  LocalizationDb,
} from "app/persistentState";

/**
 * `Localization` without the items[] reference array.
 */
export interface LocalizationStrings {
  strings: LocalizationDb;
}

/**
 * Convention for all entity objects: put localized strings inside a
 * "localized" sub-object. This removes that object from the type to make a
 * type with the localization keys removed, which can then be extended with
 * localized strings, for use in UI code.
 *
 * For example:
 *
 * ```ts
 * interface Foo {
 *   localized: {
 *     bar: LocalizationKey
 *   }
 * }
 *
 * interface LocalizedFoo extends Unlocalized<Foo> {
 *   bar: string; // localized string
 * }
 * ```
 */
export type Unlocalized<T> = Omit<T, "localized">;

// ----------------------------------------------------------------------------
// Localization Registry Types
// ----------------------------------------------------------------------------

/**
 * Persisted documents (e.g. DeviceClassEditorState) used in this app follow a
 * strong convention for localizable fields. In the document are entities which
 * have fields that are _localizable_, meaning they have values that might have
 * strings in different locales. These entities (objects) always have a property
 * called `localized`:
 *
 * ```ts
 * // DeviceClassEditorState
 * {
 *   basicData: {
 *     // other properties...
 *     localized: {
 *       description: LocalizationKey
 *     }
 *   }
 *   parameters: Record<EntityId, Parameter>,
 * }
 *
 * // Parameter
 * {
 *   // other properties...
 *   localized: {
 *     friendlyName: LocalizationKey
 *   }
 * }
 * ```
 *
 * As you can see:
 * - Localizable entities have a `localized` property, which is an object
 *   containing one or more of its own properties, each of which is a
 *   LocalizationKey.
 * - Localizable entities can appear either singly as a property of a document
 *   (which we call a 'singleton' here) or in a table keyed by EntityId.
 *
 * The localization functionality we provide relies on these localized fields
 * being discoverable and enumerable, which is what these types help with. We
 * use some fancy TypeScript-fu to gather the list of localizable fields in a
 * document that follows our strong layout convention. Each of these documents
 * is required to be accompanied by a LocalizationRegistry, which provides
 * metadata about each localizable field in the document. The TypeScript magic
 * ensures that the registry always matches the set of localizable fields in the
 * document (no more, no less) or a compile error is produced.
 *
 * Documents also separately have a property `localizations`, which holds the
 * actual localized strings keyed by the LocalizationKeys in the localizable
 * entities.
 */

/**
 * A document that owns a table of localized strings. One document is one
 * device class, library or system.
 */
export interface LocalizableDocument {
  localizations: Record<LocalizationKey, Localization>;
}

/**
 * An entity that carries localization keys, by the convention that all of them
 * live under `localized`.
 */
export interface LocalizableEntity {
  localized: Record<string, LocalizationKey | undefined>;
}

/**
 * Given a document, produces a type that is the union of the keys of its tables
 * of localizable entities. So, for a document `Doc` shaped like:
 *
 * ```ts
 * {
 *   deviceClassId: string,
 *   libraries: Record<string, string>,
 *   parameters: Record<EntityId, Parameter>,
 *   commands: Record<EntityId, Command>,
 *   basicData: {
 *     localized: {
 *       description: LocalizationKey
 *     }
 *   }
 * }
 * ```
 *
 * where `Parameter` and `Command` are localizable entities,
 * `LocalizableTableKey<Doc>` is `"parameters" | "commands"`.
 *
 * It must test `Doc[K]` against `Record<string, LocalizableEntity>` (not keyed
 * by `EntityId` as the actual tables are in our documents). The reason for this
 * is some deep TS type stuff, basically the contract breaks down due to
 * EntityId being a branded type and yields false positives in the resulting key
 * union. I am leaving a Claude-generated explanation here in case someone who
 * understands TS better than me stumbles across this:
 *
 * "Assignability to an index signature only constrains source properties whose
 * names are assignable to the key type, and no ordinary property name is
 * assignable to a branded string, so keyed by EntityId the test is vacuously
 * true for any plain object."
 */
export type LocalizableTableKey<Doc> = {
  [K in keyof Doc]-?: NonNullable<Doc[K]> extends Record<
    string,
    LocalizableEntity
  >
    ? K
    : never;
}[keyof Doc] &
  keyof Doc;

/**
 * Given a document, produces a type that is the union of the keys of its
 * singleton localizable entities. So, for a document `Doc` shaped like:
 *
 * ```ts
 * {
 *   deviceClassId: string,
 *   libraries: Record<string, string>,
 *   parameters: Record<EntityId, Parameter>,
 *   commands: Record<EntityId, Command>,
 *   basicData: {
 *     localized: {
 *       description: LocalizationKey
 *     }
 *   }
 * }
 * ```
 *
 * `LocalizableSingletonKey<Doc>` is `"basicData"`.
 */
export type LocalizableSingletonKey<Doc> = {
  [K in keyof Doc]-?: NonNullable<Doc[K]> extends LocalizableEntity ? K : never;
}[keyof Doc] &
  keyof Doc;

/**
 * Joins the two types above (resolves to the union of all keys in the document
 * that either are a localizable singleton or a table of localizable entities).
 */
export type LocalizableEntryKey<Doc> =
  | LocalizableTableKey<Doc>
  | LocalizableSingletonKey<Doc>;

/**
 * Produces the full type of the localizable entity in the document keyed by
 * this key. Works for both singletons and tables. For example, given `Doc`
 * again shaped like:
 *
 * ```ts
 * {
 *   deviceClassId: string,
 *   libraries: Record<string, string>,
 *   parameters: Record<EntityId, Parameter>,
 *   commands: Record<EntityId, Command>,
 *   basicData: BasicData,
 * }
 * ```
 *
 * where `Parameter`, `Command` and `BasicData` are localizable entities:
 * - `LocalizableEntityOf<Doc, "basicData">` is `BasicData`
 * - `LocalizableEntityOf<Doc, "parameters">` is `Parameter`
 */
export type LocalizableEntityOf<Doc, K extends keyof Doc> =
  NonNullable<Doc[K]> extends Record<string, LocalizableEntity>
    ? NonNullable<Doc[K]> extends Record<string, infer Entity>
      ? Entity
      : never
    : NonNullable<Doc[K]>;

/**
 * Extracts the field names of the `localized` record of a localizable entity.
 * For example, given a `BasicData` shaped like:
 *
 * ```ts
 * {
 *   publishDate: string,
 *   author: string,
 *   localized: {
 *     description: LocalizationKey
 *   }
 * }
 * ```
 *
 * `LocalizableFieldsOfEntity<BasicData>` is `"description"`.
 */
export type LocalizableFieldsOfEntity<Entity> = Entity extends LocalizableEntity
  ? keyof Entity["localized"] & string
  : never;

/**
 * The `localized` record of an entity type. Given the `BasicData` object above,
 * `LocalizableRecordOf<BasicData>` is `{ description: LocalizationKey }`.
 */
export type LocalizableRecordOf<Entity> = Entity extends LocalizableEntity
  ? Entity["localized"]
  : never;

/**
 * Given a document and a key of one of its localizable entities, produces the
 * union of the names of the fields of that entity that are localizable. For
 * example, given `Doc` again shaped like:
 *
 * ```ts
 * {
 *   deviceClassId: string,
 *   libraries: Record<string, string>,
 *   parameters: Record<EntityId, Parameter>,
 *   commands: Record<EntityId, Command>,
 *   basicData: BasicData,
 * }
 * ```
 *
 * where `Parameter`, `Command` and `BasicData` are localizable entities:
 * - `LocalizableFieldsForKey<Doc, "basicData">` is `"description"`
 * - `LocalizableFieldsForKey<Doc, "parameters">` is `"friendlyName"` (assuming
 *   Parameter has a localized field called friendlyName)
 */
export type LocalizableFieldsForKey<
  Doc,
  K extends keyof Doc,
> = LocalizableFieldsOfEntity<LocalizableEntityOf<Doc, K>>;

/** What a key-construction function is given. */
export interface LocalizationKeyContext<Doc, Entity> {
  document: Doc;
  entity: Unlocalized<Entity>;
  /** Undefined for a singleton. */
  entityId: EntityId | undefined;
}

/**
 * An entry in a localization registry; metadata about a specific localizable
 * field.
 */
export interface LocalizableFieldSpec<Doc, Entity> {
  /** What to call the field in the localizations editor. */
  label: string;

  /**
   * The value this field's references were stored under in `Localization.items`.
   * Deprecated; to be removed.
   */
  itemType: LocalizationReferencedItem["itemType"];

  /**
   * A required field keeps its localization when its value is blanked; an
   * optional one drops it.
   */
  required?: boolean;

  /**
   * Builds the LocalizationKey for this field. This should typically be a value
   * that disambiguates the field from other fields in the same entity and
   * across the document. For example, for a member of a device class's
   * parameters table, you might use `param_${context.entity.codexId}`
   *
   * Returns undefined when the key cannot be constructed, which happens when
   * it is derived from a related entity that is missing.
   */
  makeKey: (context: LocalizationKeyContext<Doc, Entity>) => string | undefined;
}

/**
 * Whether a localized field is required. Enforces that the `required` member in
 * `LocalizableFieldSpec` is correct at compile time.
 */
export type RequiredFlagFor<
  Entity,
  Field extends keyof LocalizableRecordOf<Entity>,
> = undefined extends LocalizableRecordOf<Entity>[Field]
  ? { required?: false }
  : { required: true };

/**
 * The specs for all localizable fields in a single localizable entity of `Doc`.
 *
 * Each spec's `required` is narrowed to what the entity's own type says, so a
 * registry that forgets `required: true` on a mandatory field, or claims it on
 * an optional one, is a compile error.
 */
export type LocalizableFieldSpecs<Doc, Entity> = {
  [Field in LocalizableFieldsOfEntity<Entity>]: LocalizableFieldSpec<
    Doc,
    Entity
  > &
    RequiredFlagFor<Entity, Field & keyof LocalizableRecordOf<Entity>>;
};

/** A spec for a localizable table of entities in a document. */
export interface LocalizableTableSpec<Doc, Entity> {
  kind: "table";
  /** What to call one entity of this kind in the localizations editor. */
  label: string;
  fields: LocalizableFieldSpecs<Doc, Entity>;
}

/** A spec for a localizable singleton object in a document. */
export interface LocalizableSingletonSpec<Doc, Entity> {
  kind: "singleton";
  label: string;
  fields: LocalizableFieldSpecs<Doc, Entity>;
}

/**
 * The metadata registry for all localizable fields in a document. This ties
 * together most of the types defined above. Given a document `Doc` like:
 *
 * ```ts
 * {
 *   deviceClassId: string,
 *   libraries: Record<string, string>,
 *   parameters: Record<EntityId, Parameter>,
 *   commands: Record<EntityId, Command>,
 *   basicData: BasicData,
 * }
 * ```
 *
 * where `Parameter`, `Command` and `BasicData` are localizable entities, you
 * can define a localization metadata registry for this type that looks like
 * this:
 *
 * ```ts
 * const REGISTRY: LocalizationRegistry<Doc> = {
 *   parameters: {
 *     kind: "table",
 *     label: "Parameter",
 *     fields: {
 *       friendlyName: {
 *         label: "Friendly Name",
 *         itemType: "paramName",
 *         makeKey: ({ entity }) => `param_${entity.codexId}`,
 *       },
 *     },
 *   },
 *   commands: {
 *     kind: "table",
 *     label: "Command",
 *     fields: {
 *       friendlyName: {
 *         label: "Friendly Name",
 *         itemType: "cmdName",
 *         makeKey: ({ entity }) => `command_${entity.codexId}`,
 *       },
 *     },
 *   },
 *   basicData: {
 *     kind: "singleton",
 *     label: "Device class",
 *     fields: {
 *       description: {
 *         label: "Description",
 *         itemType: "devClassDesc",
 *         required: true,
 *         makeKey: () => "devClass_description"
 *       }
 *     }
 *   }
 * };
 * ```
 *
 * This then allows you to use the functions defined in `registry.ts` to
 * work easily with the localizable fields in your document.
 */
export type LocalizationRegistry<Doc> = {
  [K in LocalizableEntryKey<Doc>]: K extends LocalizableTableKey<Doc>
    ? LocalizableTableSpec<Doc, LocalizableEntityOf<Doc, K>>
    : LocalizableSingletonSpec<Doc, NonNullable<Doc[K]>>;
};

/**
 * One place a localization is referenced from. So, in the example above, you
 * might have:
 *
 * ```ts
 * {
 *   table: "parameters",
 *   entityId: "V1StGXR8_Z5jdHi6B-myT",
 *   field: "friendlyName"
 * }
 * ```
 *
 * or:
 *
 * ```ts
 * {
 *   table: "basicData",
 *   field: "description"
 * }
 * ```
 */
export interface LocalizationReference {
  table: string;
  /** Undefined for a singleton. */
  entityId?: EntityId;
  field: string;
}

/**
 * For each key in a document's `localizations` record, this type lists all the
 * places that key is referenced in the document.
 */
export type LocalizationIndex = Record<
  LocalizationKey,
  LocalizationReference[]
>;

/** Identifies one entity to the localization machinery. */
export interface LocalizableEntityRef<Doc> {
  table: LocalizableEntryKey<Doc>;
  /** Undefined for a singleton. */
  entityId?: EntityId;
}

/**
 * The values to give the localized fields of an entity being created. Required
 * properties must be given a string value. Optional properties may be given
 * `undefined` in which case a localization entry is not created for that
 * property.
 */
export type LocalizationValues<Doc, K extends LocalizableEntryKey<Doc>> = {
  [Field in LocalizableFieldsForKey<
    Doc,
    K
  >]: undefined extends LocalizableRecordOf<LocalizableEntityOf<Doc, K>>[Field &
    keyof LocalizableRecordOf<LocalizableEntityOf<Doc, K>>]
    ? string | undefined
    : string;
};

/** Identifies one localized field of one entity. */
export interface LocalizableFieldRef<Doc, K extends LocalizableEntryKey<Doc>> {
  table: K;
  /** Undefined for a singleton. */
  entityId?: EntityId;
  field: LocalizableFieldsForKey<Doc, K>;
}

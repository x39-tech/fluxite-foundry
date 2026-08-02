// Utilities for maintaining a registry of a document's localized strings.

import {
  EntityId,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { getUniqueItemId } from "utils/utils";
import {
  LocalizationIndex,
  LocalizationRegistry,
  LocalizationReference,
  LocalizableDocument,
  LocalizableEntity,
  LocalizableEntityRef,
  LocalizableEntityOf,
  LocalizableEntryKey,
  LocalizableFieldRef,
  LocalizableFieldSpec,
  LocalizableFieldSpecs,
  LocalizableFieldsForKey,
  LocalizableRecordOf,
  LocalizationValues,
  Unlocalized,
} from "./types";

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

/**
 * Computes what refers to each localization in the document, in one pass over
 * its localization-bearing tables. Keys a field points at but that have no
 * localizations are included.
 */
export function buildLocalizationIndex<Doc extends LocalizableDocument>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
): LocalizationIndex {
  const index: LocalizationIndex = {};

  for (const occurrence of localizedFields(document, registry)) {
    if (!occurrence.key) {
      continue;
    }

    (index[occurrence.key] ??= []).push(referenceTo(occurrence));
  }

  return index;
}

/**
 * Returns the keys of strings the document holds that nothing refers to.
 */
export function collectOrphans<Doc extends LocalizableDocument>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
): LocalizationKey[] {
  const index = buildLocalizationIndex(document, registry);

  return localizationKeys(document).filter((key) => !index[key]?.length);
}

export const localizationProblems = {
  // A field points at a string the document does not hold.
  MISSING: "missingLocalization",
  // A string the document holds has no value in any locale.
  EMPTY: "emptyLocalization",
  // A field the schema says must have a key does not have one.
  UNKEYED: "unkeyedRequiredField",
} as const;

export type LocalizationProblem =
  (typeof localizationProblems)[keyof typeof localizationProblems];

export interface LocalizationIntegrityProblem {
  problem: LocalizationProblem;
  // Absent for a field that has no key at all, which is the problem itself.
  key?: LocalizationKey;
  // Where the reference came from, for a problem that is about one.
  reference?: LocalizationReference;
  message: string;
}

/**
 * Checks that the document's localized fields and its string table agree with
 * each other.
 */
export function checkIntegrity<Doc extends LocalizableDocument>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
): LocalizationIntegrityProblem[] {
  const problems: LocalizationIntegrityProblem[] = [];

  for (const occurrence of localizedFields(document, registry)) {
    const key = occurrence.key;
    const reference = referenceTo(occurrence);

    if (!key) {
      if (occurrence.spec.required) {
        problems.push({
          problem: localizationProblems.UNKEYED,
          reference,
          message: `${describeReference(reference)} is required but has no localization`,
        });
      }
      continue;
    }

    if (document.localizations[key]) {
      continue;
    }

    problems.push({
      problem: localizationProblems.MISSING,
      key,
      reference,
      message: `${describeReference(reference)} refers to localization "${key}", which the document does not have`,
    });
  }

  for (const key of localizationKeys(document)) {
    if (Object.keys(document.localizations[key].strings).length === 0) {
      problems.push({
        problem: localizationProblems.EMPTY,
        key,
        message: `Localization "${key}" has no string in any locale`,
      });
    }
  }

  return problems;
}

export function describeReference(reference: LocalizationReference): string {
  const entity = reference.entityId
    ? `${reference.table}/${reference.entityId}`
    : reference.table;
  return `${entity}.${reference.field}`;
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Creates the strings for a localizable entity that is being constructed, and
 * returns the `localized` record to give it.
 */
export function createLocalizedFields<
  Doc extends LocalizableDocument,
  K extends LocalizableEntryKey<Doc>,
>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
  table: K,
  entityId: EntityId | undefined,
  entity: Unlocalized<LocalizableEntityOf<Doc, K>>,
  values: LocalizationValues<Doc, K>,
  locale: string,
): LocalizableRecordOf<LocalizableEntityOf<Doc, K>> {
  const fields = fieldSpecs(registry, table);
  const localized: Record<string, LocalizationKey | undefined> = {};

  for (const field of fieldNames<Doc, K>(fields)) {
    const spec = fields[field];
    const value = values[field];
    if (value === undefined || (value === "" && !spec.required)) {
      continue;
    }

    const key = spec.makeKey({ document, entity, entityId });
    if (key === undefined) {
      continue;
    }

    localized[field] = addLocalization(document, key, value, locale);
  }

  return localized as LocalizableRecordOf<LocalizableEntityOf<Doc, K>>;
}

/**
 * Sets one localized field of one entity in the given locale, creating the
 * string if the field does not have one and deleting it if the value is
 * blanked and the field is optional.
 *
 * Does nothing if the entity is not in the document.
 */
export function setLocalizedValue<
  Doc extends LocalizableDocument,
  K extends LocalizableEntryKey<Doc>,
>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
  target: LocalizableFieldRef<Doc, K>,
  newValue: string,
  locale: string,
): void {
  const spec = fieldSpecs(registry, target.table)[target.field];
  if (!spec) {
    return;
  }

  const entity = lookupEntity(document, registry, target);
  if (!entity) {
    return;
  }

  const field = target.field;
  const key = entity.localized[field];
  const localization = key ? document.localizations[key] : undefined;

  if (newValue === "" && !spec.required) {
    delete entity.localized[field];
    if (key) {
      removeLocalization(document, registry, key);
    }
    return;
  }

  if (localization) {
    localization.strings[locale] = newValue;
    return;
  }

  const newKey = spec.makeKey({ document, entity, entityId: target.entityId });
  if (newKey === undefined) {
    return;
  }

  entity.localized[field] = addLocalization(document, newKey, newValue, locale);
}

/**
 * Drops the given entities' references to localization strings, removing the
 * strings themselves if nothing else references them.
 *
 * Call this while the entities are still in the document.
 */
export function removeLocalizationsFor<Doc extends LocalizableDocument>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
  refs: LocalizableEntityRef<Doc>[],
): void {
  const removed = new Set(refs.map((ref) => refKey(ref.table, ref.entityId)));
  const index = buildLocalizationIndex(document, registry);

  for (const [keyString, references] of Object.entries(index)) {
    const key = LocalizationKey(keyString);
    if (!document.localizations[key]) {
      continue;
    }

    // The string goes only when every place that referred to it is going.
    const going = references.filter((reference) =>
      removed.has(refKey(reference.table, reference.entityId)),
    );

    if (going.length > 0 && going.length === references.length) {
      delete document.localizations[key];
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// There are two ways this module reaches into a registry.
//
// Most of it works from a table name the caller passed in. That path is fully
// typed: the entity, its localized fields, and its key-building function are
// all known from the caller's own document type.
//
// The rest of it walks the whole document, collecting table and field names as
// it goes. A name gathered that way is just a string, and the type system
// cannot follow it back to the registry entry it came from, so those two
// functions go through the by-name view below. Even there the document and the
// entities stay properly typed; the only thing given up is the link from a
// name to the one entry it names.

/**
 * One localizable entity of `Doc`, written so that its `localized` record is
 * visible. A registry key only ever names an entity that has one, but that is
 * not something the type system works out for itself, so we spell it out.
 */
type EntityFor<Doc, K extends LocalizableEntryKey<Doc>> = LocalizableEntityOf<
  Doc,
  K
> &
  LocalizableEntity;

/** Any one of the field specs a registry for `Doc` can hold. */
type FieldSpecOf<Doc> = LocalizableFieldSpec<
  Doc,
  LocalizableEntityOf<Doc, LocalizableEntryKey<Doc>>
>;

/** A registry entry reached by name rather than by key. */
interface EntryByName<Doc> {
  kind: "table" | "singleton";
  label: string;
  fields: Record<string, FieldSpecOf<Doc>>;
}

/** One localized field of one entity, as found by walking the document. */
interface FieldOccurrence<Doc> {
  table: string;
  entityId?: EntityId;
  field: string;
  spec: FieldSpecOf<Doc>;
  key: LocalizationKey | undefined;
}

function entriesByName<Doc extends LocalizableDocument>(
  registry: LocalizationRegistry<Doc>,
): [string, EntryByName<Doc>][] {
  return Object.entries(registry) as [string, EntryByName<Doc>][];
}

// Reads one of the document's tables or singletons by name.
function entryValue(document: object, table: PropertyKey): unknown {
  return (document as Record<PropertyKey, unknown>)[table];
}

function localizationKeys(document: LocalizableDocument): LocalizationKey[] {
  return Object.keys(document.localizations) as LocalizationKey[];
}

// Walks every localized field of every entity the registry describes.
function* localizedFields<Doc extends LocalizableDocument>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
): Generator<FieldOccurrence<Doc>> {
  for (const [table, entry] of entriesByName(registry)) {
    for (const { entityId, entity } of entitiesIn(document, table, entry)) {
      for (const [field, spec] of Object.entries(entry.fields)) {
        yield {
          table,
          entityId,
          field,
          spec,
          key: entity.localized?.[field],
        };
      }
    }
  }
}

function* entitiesIn<Doc>(
  document: LocalizableDocument,
  table: string,
  entry: EntryByName<Doc>,
): Generator<{ entityId?: EntityId; entity: LocalizableEntity }> {
  const value = entryValue(document, table);
  if (!value) {
    return;
  }

  if (entry.kind === "singleton") {
    yield { entity: value as LocalizableEntity };
    return;
  }

  for (const [entityId, entity] of Object.entries(
    value as Record<string, LocalizableEntity>,
  )) {
    yield { entityId: EntityId(entityId), entity };
  }
}

function referenceTo<Doc>(
  occurrence: FieldOccurrence<Doc>,
): LocalizationReference {
  return {
    table: occurrence.table,
    entityId: occurrence.entityId,
    field: occurrence.field,
  };
}

/**
 * The specs for the localized fields of one entry of the registry.
 *
 * Reading `registry[table]` hands back every kind of entry the registry can
 * hold at once: the type system tracks the registry as a whole and will not
 * narrow it down to the single entry a key names. The entry really is the one
 * for `table`, so that is stated here, in one place, and every caller gets
 * precise types for the entity and its fields.
 */
function fieldSpecs<
  Doc extends LocalizableDocument,
  K extends LocalizableEntryKey<Doc>,
>(
  registry: LocalizationRegistry<Doc>,
  table: K,
): LocalizableFieldSpecs<Doc, LocalizableEntityOf<Doc, K>> {
  return registry[table].fields as LocalizableFieldSpecs<
    Doc,
    LocalizableEntityOf<Doc, K>
  >;
}

function fieldNames<
  Doc extends LocalizableDocument,
  K extends LocalizableEntryKey<Doc>,
>(
  fields: LocalizableFieldSpecs<Doc, LocalizableEntityOf<Doc, K>>,
): LocalizableFieldsForKey<Doc, K>[] {
  return Object.keys(fields) as LocalizableFieldsForKey<Doc, K>[];
}

function lookupEntity<
  Doc extends LocalizableDocument,
  K extends LocalizableEntryKey<Doc>,
>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
  target: LocalizableFieldRef<Doc, K>,
): EntityFor<Doc, K> | undefined {
  const value = entryValue(document, target.table);
  if (!value) {
    return undefined;
  }

  if (registry[target.table].kind === "singleton") {
    return value as EntityFor<Doc, K>;
  }

  if (!target.entityId) {
    return undefined;
  }

  return (value as Record<string, EntityFor<Doc, K> | undefined>)[
    target.entityId
  ];
}

function refKey(table: string | number | symbol, entityId?: EntityId): string {
  return `${String(table)}\0${entityId ?? ""}`;
}

// Adds a string under a key derived from the desired one, made unique against
// the keys the document already uses.
function addLocalization(
  document: LocalizableDocument,
  desiredKey: string,
  value: string,
  locale: string,
): LocalizationKey {
  const key = LocalizationKey(
    getUniqueItemId(Object.keys(document.localizations), desiredKey),
  );

  document.localizations[key] = {
    strings: LocalizationDbSchema.parse({ [locale]: value }),
  };

  return key;
}

// Deletes a string that nothing refers to any more.
function removeLocalization<Doc extends LocalizableDocument>(
  document: Doc,
  registry: LocalizationRegistry<Doc>,
  key: LocalizationKey,
): void {
  const localization = document.localizations[key];
  if (!localization) {
    return;
  }

  const references = buildLocalizationIndex(document, registry)[key] ?? [];
  if (references.length === 0) {
    delete document.localizations[key];
  }
}

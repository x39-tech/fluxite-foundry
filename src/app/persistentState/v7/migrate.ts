import { nanoid } from "nanoid";
import * as V6 from "../v6/state";
import * as V7 from "./state";

// v6 -> v7: tagged parameter defaults, DMX mapping bounds, multiple DMX
// serializers
//
// Fluxite Codex lets a parameter default and the start of a DMX mapping range
// or unmapped parameter be null, meaning the parameter is inactive. v6 had no
// way to store a null default, and stored a null start as an absent one. v7
// tags each default and each set of mapping bounds with its type, so that an
// inactive value can be stored explicitly and a start and end of different
// types can't be. This matches the similar interface changes made in Delver
// between 0.1.0-alpha.13 and alpha.15.
//
// v7 also lets a device class have any number of DMX serializers, where v6
// only allowed one.

function migrateDefault(
  value: number | boolean | undefined,
): V7.ParameterDefault | undefined {
  if (value === undefined) return undefined;
  return typeof value === "boolean"
    ? { type: "bool", value }
    : { type: "numeric", value };
}

function migrateParameter(param: V6.Parameter): V7.Parameter {
  const { default: value, ...rest } = param;
  const migrated = migrateDefault(value);
  return { ...rest, ...(migrated ? { default: migrated } : {}) };
}

// An end without a start, or an end of a different type than the start, was
// never valid Fluxite Codex and is dropped.
function migrateBounds(
  start: V6.DmxMappingBound | undefined,
  end: V6.DmxMappingBound | undefined,
): V7.DmxMappingBounds {
  if (start === undefined) return { type: "null" };
  if (typeof start === "boolean") {
    return typeof end === "boolean"
      ? { type: "bool", start, end }
      : { type: "bool", start };
  }
  return typeof end === "number"
    ? { type: "numeric", start, end }
    : { type: "numeric", start };
}

function migrateMapping(mapping: V6.DmxMapping): V7.DmxMapping {
  const { unmappedParams, ...rest } = mapping;
  return {
    ...rest,
    ranges: mapping.ranges.map(({ start, end, ...range }) => ({
      ...range,
      bounds: migrateBounds(start, end),
    })),
    ...(unmappedParams
      ? {
          unmappedParams: unmappedParams.map(({ start, end, ...up }) => ({
            ...up,
            bounds: migrateBounds(start, end),
          })),
        }
      : {}),
  };
}

function migrateDmxSerializer(dmx: V6.DmxSerializerState): V7.DmxSerializer {
  const mappingGroups: Record<string, V7.DmxMappingGroup> = {};
  for (const [id, group] of Object.entries(dmx.mappingGroups)) {
    mappingGroups[id] = {
      ...group,
      mappings: group.mappings.map(migrateMapping),
    };
  }
  return {
    codexId: V7.CodexId("dmx"),
    access: ["read"],
    lifetime: "static",
    ...dmx,
    mappingGroups,
  };
}

function migrateDocument(doc: V6.Document): V7.Document {
  const { dmxSerializer, ...rest } = doc;
  const parameters: Record<string, V7.Parameter> = {};
  for (const [id, param] of Object.entries(doc.parameters)) {
    parameters[id] = migrateParameter(param);
  }
  const dmxSerializers: Record<string, V7.DmxSerializer> = {};
  if (dmxSerializer) {
    dmxSerializers[nanoid()] = migrateDmxSerializer(dmxSerializer);
  }
  return { ...rest, parameters, dmxSerializers };
}

/**
 * Migrates state from V6 to V7.
 *
 * Changes:
 * - `Parameter.default` is tagged with its type, and may be inactive.
 * - The `start` and `end` of a DMX mapping range or unmapped parameter become
 *   `bounds`, tagged with their type. An absent start becomes null bounds.
 * - The optional `dmxSerializer` becomes the `dmxSerializers` table.
 */
export function migrateV6toV7(
  state: V6.AppPersistentState,
): V7.AppPersistentState {
  const documents: Record<string, V7.Document> = {};
  for (const [id, doc] of Object.entries(state.documents)) {
    documents[id] = migrateDocument(doc);
  }

  return { ...state, documents };
}

// Determine what a device class document's localization keys are called when it
// is exported to Fluxite Codex.
//
// Internally a LocalizationKey is an opaque nanoid, so that renaming the entity
// that uses a string cannot make its key stale. Fluxite Codex wants keys that
// read well, and treats them as part of a definition's public surface: its
// _overlay localization_ features supports providing more localization strings
// for a document in a separate document, keyed by the original document's keys.
//
// A name comes from the first of these that applies:
//
//   1. `Localization.exportKey`, the name the string was imported under or the
//      user gave it. It is authored data and wins.
//   2. A name derived from what refers to the string, built from the current
//      codex ids. For example, "param_main-dimmer" or
//      "command_reset_arg_granularity_enumChoice_global_name".
//   3. The internal key, when neither is available.
//
// The result is then made unique, because none of the three is guaranteed to
// be.

import {
  CodexId,
  DeviceClassDocument,
  EntityId,
  EnumChoiceParent,
  LocalizationKey,
} from "app/persistentState";
import { buildLocalizationIndex } from "features/localizations/registry";
import { LocalizationReference } from "features/localizations/types";
import { getUniqueItemId } from "utils/utils";
import { DEVICE_CLASS_LOCALIZATIONS } from "./localizationRegistry";

/** The exported name of each of a document's localization keys. */
export interface ExportKeys {
  /**
   * The name to write for a key. A field that holds a key always gets a name;
   * one that holds nothing stays holding nothing.
   */
  of(key: LocalizationKey): string;
  of(key: LocalizationKey | undefined): string | undefined;
}

export function buildExportKeys(document: DeviceClassDocument): ExportKeys {
  const index = buildLocalizationIndex(document, DEVICE_CLASS_LOCALIZATIONS);
  const names = new Map<string, string>();
  const taken: string[] = [];

  // Sorted so that a run of exports of the same document produces the same
  // names, including which of two colliding keys gets the suffix.
  for (const keyString of Object.keys(document.localizations).sort()) {
    const key = LocalizationKey(keyString);
    const desired =
      document.localizations[key].exportKey ??
      // A string can be referred to from more than one place once the
      // localizations editor can merge them. It only gets one exported name,
      // so the first reference names it; the index walks the document in a
      // stable order, so which one that is does not change between exports.
      deriveName(document, index[key]?.[0]) ??
      keyString;

    const name = getUniqueItemId(taken, desired);
    taken.push(name);
    names.set(keyString, name);
  }

  // A key the document does not hold a string for is written through
  // unchanged; it is a dangling reference either way, and keeping the value
  // makes that visible in the exported file rather than silently dropping it.
  function of(key: LocalizationKey): string;
  function of(key: LocalizationKey | undefined): string | undefined;
  function of(key: LocalizationKey | undefined): string | undefined {
    return key === undefined ? undefined : (names.get(key) ?? key);
  }

  return { of };
}

// ---------------------------------------------------------------------------
// Deriving a name from the entity that uses the string
// ---------------------------------------------------------------------------

const CLASS_PREFIXES: Record<string, string> = {
  parameterClasses: "paramClass",
  structureClasses: "structClass",
  serializerClasses: "serClass",
  resourceClasses: "resClass",
  commandClasses: "commandClass",
};

function deriveName(
  document: DeviceClassDocument,
  reference: LocalizationReference | undefined,
): string | undefined {
  if (!reference) {
    return undefined;
  }

  const { table, entityId, field } = reference;

  if (table === "basicData") {
    return "devClass_description";
  }

  if (entityId === undefined) {
    return undefined;
  }

  const classPrefix = CLASS_PREFIXES[table];
  if (classPrefix) {
    const codexId = classCodexId(document, table, entityId);
    return codexId ? `${classPrefix}_${codexId}_${field}` : undefined;
  }

  switch (table) {
    case "commandClassArguments":
      return classMemberName(document, "arg", entityId, field);
    case "commandClassReturnValues":
      return classMemberName(document, "return", entityId, field);
    case "parameters": {
      const codexId = document.parameters[entityId]?.codexId;
      return codexId ? `param_${codexId}` : undefined;
    }
    case "commands": {
      const codexId = document.commands[entityId]?.codexId;
      return codexId ? `command_${codexId}` : undefined;
    }
    case "enumChoices":
      return enumChoiceName(document, entityId, field);
    default:
      return undefined;
  }
}

function classCodexId(
  document: DeviceClassDocument,
  table: string,
  entityId: EntityId,
): CodexId | undefined {
  const classes = (
    document as unknown as Record<
      string,
      Record<EntityId, { codexId: CodexId } | undefined>
    >
  )[table];
  return classes?.[entityId]?.codexId;
}

// An argument or return value is named within its owning command class.
function classMemberName(
  document: DeviceClassDocument,
  kind: "arg" | "return",
  entityId: EntityId,
  field: string,
): string | undefined {
  const member =
    kind === "arg"
      ? document.commandClassArguments[entityId]
      : document.commandClassReturnValues[entityId];
  if (!member) {
    return undefined;
  }

  const classCodex = document.commandClasses[member.parentId]?.codexId;
  return classCodex
    ? `commandClass_${classCodex}_${kind}_${member.codexId}_${field}`
    : undefined;
}

function enumChoiceName(
  document: DeviceClassDocument,
  entityId: EntityId,
  field: string,
): string | undefined {
  const choice = document.enumChoices[entityId];
  if (!choice) {
    return undefined;
  }

  const prefix = parentPrefix(document, choice.parent);
  return prefix ? `${prefix}_enumChoice_${choice.codexId}_${field}` : undefined;
}

/**
 * The prefix identifying an enum choice's parent, which is what makes a
 * choice's exported name readable and unique.
 *
 * Returns undefined when the parent or its class is missing, which is a
 * document that has a dangling reference.
 */
function parentPrefix(
  document: DeviceClassDocument,
  parent: EnumChoiceParent,
): string | undefined {
  switch (parent.type) {
    case "paramAdditional": {
      const codexId = document.parameters[parent.id]?.codexId;
      return codexId ? `param_${codexId}` : undefined;
    }
    case "paramClass": {
      const codexId = document.parameterClasses[parent.id]?.codexId;
      return codexId ? `paramClass_${codexId}` : undefined;
    }
    case "cmdClassArg": {
      const arg = document.commandClassArguments[parent.id];
      const classCodexId =
        arg && document.commandClasses[arg.parentId]?.codexId;
      return classCodexId
        ? `commandClass_${classCodexId}_arg_${arg.codexId}`
        : undefined;
    }
    case "cmdClassRet": {
      const ret = document.commandClassReturnValues[parent.id];
      const classCodexId =
        ret && document.commandClasses[ret.parentId]?.codexId;
      return classCodexId
        ? `commandClass_${classCodexId}_return_${ret.codexId}`
        : undefined;
    }
    case "cmdArg": {
      const cmdCodexId = document.commands[parent.cmdId]?.codexId;
      const argCodexId =
        parent.idType === "local"
          ? document.commandClassArguments[parent.id]?.codexId
          : parent.id;

      return cmdCodexId && argCodexId
        ? `command_${cmdCodexId}_arg_${argCodexId}`
        : undefined;
    }
    case "cmdRet": {
      const cmdCodexId = document.commands[parent.cmdId]?.codexId;
      const retCodexId =
        parent.idType === "local"
          ? document.commandClassReturnValues[parent.id]?.codexId
          : parent.id;

      return cmdCodexId && retCodexId
        ? `command_${cmdCodexId}_return_${retCodexId}`
        : undefined;
    }
  }
}

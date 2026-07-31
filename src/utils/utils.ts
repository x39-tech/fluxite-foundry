import { clsx, type ClassValue } from "clsx";
import { IJsonRowNode } from "flexlayout-react";
import { nanoid } from "nanoid";
import { twMerge } from "tailwind-merge";
import {
  CodexId,
  EntityId,
  FCUnit,
  ParameterReference,
} from "app/persistentState";

export interface ItemEditor {
  id: EntityId;
  codexId: CodexId;
}

export function getUniqueItemId(
  existingItemIds: string[],
  defaultId: string = "my-new-item",
): string {
  let newItemId = defaultId;
  let deDupNumber = 1;

  while (existingItemIds.includes(newItemId)) {
    newItemId = `${defaultId}-${deDupNumber++}`;
  }

  return newItemId;
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get a message to show the user from a caught value, which is not guaranteed
 * to be an Error.
 */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function getDefaultWindowLayout(): IJsonRowNode {
  return {
    type: "row",
    weight: 100,
    id: nanoid(),
    children: [
      {
        type: "tabset",
        weight: 50,
        id: nanoid(),
        children: [
          {
            type: "tab",
            name: "Parameters Editor",
            component: "parametersEditor",
            id: nanoid(),
          },
        ],
      },
      {
        type: "tabset",
        weight: 50,
        id: nanoid(),
        children: [
          {
            type: "tab",
            name: "Device Info Editor",
            component: "deviceInfoEditor",
            id: nanoid(),
          },
        ],
      },
    ],
  };
}

// Formats a human-readable file size using 1000 as the divisor
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1000;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export type OrgId = { type: "user"; id: string } | { type: "org"; id: string };

export enum EntityType {
  Lib,
  Dev,
  Sys,
}

// TODO: use e173support for this logic.
export function parseQualifiedId(
  qualifiedId: string,
): [EntityType, OrgId, string] | null {
  const parts = qualifiedId.split(".");

  if (parts.length < 3) {
    return null;
  }

  // Find the entity type position (lib, dev, or sys)
  let entityTypeIndex = -1;
  let entityType: EntityType | null = null;

  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === "lib") {
      entityType = EntityType.Lib;
      entityTypeIndex = i;
      break;
    } else if (parts[i] === "dev") {
      entityType = EntityType.Dev;
      entityTypeIndex = i;
      break;
    } else if (parts[i] === "sys") {
      entityType = EntityType.Sys;
      entityTypeIndex = i;
      break;
    }
  }

  if (entityTypeIndex === -1 || entityType === null) {
    return null;
  }

  // Everything before the entity type is the org-id
  const orgIdParts = parts.slice(0, entityTypeIndex);

  // Everything after the entity type is the identifier
  const identifierParts = parts.slice(entityTypeIndex + 1);

  if (orgIdParts.length === 0 || identifierParts.length === 0) {
    return null;
  }

  const orgIdString = orgIdParts.join(".");
  const identifier = identifierParts.join(".");

  // Determine if this is a user ID or organization ID
  // User IDs follow the pattern: org.esta.e173.user.{uuid}
  let orgId: OrgId;

  // Check if this looks like a user ID pattern
  const looksLikeUserIdPattern =
    orgIdParts.length >= 4 &&
    orgIdParts[0] === "org" &&
    orgIdParts[1] === "esta" &&
    orgIdParts[2] === "e173" &&
    orgIdParts[3] === "user";

  if (looksLikeUserIdPattern) {
    // This should be a user ID - the UUID is the 5th part
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Validate that we have exactly 5 parts and the UUID is valid
    if (orgIdParts.length !== 5 || !uuidRegex.test(orgIdParts[4])) {
      return null;
    }

    orgId = { type: "user", id: orgIdParts[4] };
  } else {
    // This is a regular organization ID
    orgId = { type: "org", id: orgIdString };
  }

  return [entityType, orgId, identifier];
}

export function buildQualifiedId(
  idType: EntityType,
  orgId: OrgId,
  id: string,
): string {
  // Build the org-id part
  let orgIdString: string;
  if (orgId.type === "user") {
    orgIdString = `org.esta.e173.user.${orgId.id}`;
  } else {
    orgIdString = orgId.id;
  }

  // Map the entity type to its string representation
  let entityTypeString: string;
  switch (idType) {
    case EntityType.Lib:
      entityTypeString = "lib";
      break;
    case EntityType.Dev:
      entityTypeString = "dev";
      break;
    case EntityType.Sys:
      entityTypeString = "sys";
      break;
  }

  // Build the qualified ID: org-id.entity-type.identifier
  return `${orgIdString}.${entityTypeString}.${id}`;
}

export function unitToString(unit?: FCUnit): string {
  if (unit) {
    if (unit.exponent) {
      return `${unit.name} ^ ${unit.exponent}`;
    } else {
      return unit.name;
    }
  } else {
    return "N/A";
  }
}

// Helper type to extract only the keys of T where the value is optional
type OptionalKeys<T> = {
  [K in keyof T]: undefined extends T[K] ? K : never;
}[keyof T];

export function assignOrDelete<T, K extends OptionalKeys<T>>(
  obj: T,
  property: K,
  value: T[K],
) {
  if (value !== undefined) {
    obj[property] = value;
  } else {
    delete obj[property];
  }
}

// ---------------------------------------------------------------------------
// ParameterReference Helpers
// ---------------------------------------------------------------------------

// Regex to match parameter reference syntax: "paramId" or "paramId[index]"
const PARAM_REF_REGEX = /^([^[\]]+)(?:\[(\d+)\])?$/;

/**
 * Parses a parameter reference string from Fluxite Codex format.
 * Examples:
 *   "frame" -> { codexId: "frame" }
 *   "frame[0]" -> { codexId: "frame", index: 0 }
 *   "frame[1]" -> { codexId: "frame", index: 1 }
 */
export function parseParameterReference(refString: string): ParameterReference {
  const match = refString.match(PARAM_REF_REGEX);
  if (!match) {
    // If the regex doesn't match, treat the entire string as the codexId
    return { codexId: CodexId(refString) };
  }

  const codexId = CodexId(match[1]);
  const indexStr = match[2];

  if (indexStr !== undefined) {
    return { codexId, index: parseInt(indexStr, 10) };
  }

  return { codexId };
}

/**
 * Serializes a ParameterReference to Fluxite Codex format string.
 * Examples:
 *   { codexId: "frame" } -> "frame"
 *   { codexId: "frame", index: 0 } -> "frame[0]"
 *   { codexId: "frame", index: 1 } -> "frame[1]"
 */
export function serializeParameterReference(ref: ParameterReference): string {
  if (ref.index !== undefined) {
    return `${ref.codexId}[${ref.index}]`;
  }
  return ref.codexId;
}

/** Reload the app. */
export function reloadApp(): void {
  window.location.reload();
}

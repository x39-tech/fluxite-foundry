import { CodexId, EntityId } from "app/persistentState";

// The Codex ID of a DMX serializer that the editor creates.
export const NEW_DMX_SERIALIZER_ID = CodexId("dmx");

/**
 * Temporary hack for editing the first DMX serializer in the document until
 * we support editing more than one.
 */
export function firstDmxSerializer<T>(document: {
  dmxSerializers: Record<EntityId, T>;
}): T | undefined {
  return Object.values(document.dmxSerializers)[0];
}

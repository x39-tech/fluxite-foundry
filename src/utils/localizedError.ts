// Errors whose message will be shown to a user.

import { MessageDescriptor } from "@lingui/core";

/**
 * An error whose message is shown to the user.
 *
 * `Error.message` still holds the US English, for use in a stack trace or
 * console log.
 */
export class LocalizedError extends Error {
  readonly descriptor: MessageDescriptor;

  constructor(descriptor: MessageDescriptor, options?: ErrorOptions) {
    super(englishOf(descriptor), options);
    this.name = "LocalizedError";
    this.descriptor = descriptor;
  }
}

// The US English of a descriptor.
function englishOf(descriptor: MessageDescriptor): string {
  const template = descriptor.message ?? descriptor.id;
  const { values } = descriptor;
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}

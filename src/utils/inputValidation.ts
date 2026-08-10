import { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { firstInvalidIdentifierCharacter } from "codex/categories";

export interface InputValidationResult {
  isValid: boolean;
  /** Why the input was rejected. */
  feedback?: MessageDescriptor;
}

const FEEDBACK = {
  notANumber: msg({
    id: "validation.notANumber",
    message: "Input must be a valid number",
  }),
  notANumberOrEmpty: msg({
    id: "validation.notANumberOrEmpty",
    message: "Input must be a valid number or empty",
  }),
  outOfRange: msg({
    id: "validation.outOfRange",
    message: "Input must be between minimum and maximum value",
  }),
  idEmpty: msg({ id: "validation.id.empty", message: "ID must not be empty" }),
  idNotUnique: msg({
    id: "validation.id.notUnique",
    message: "ID must be unique",
  }),
  idHasSpace: msg({
    id: "validation.id.hasSpace",
    message: "ID must not contain a space",
  }),
  idHasTab: msg({
    id: "validation.id.hasTab",
    message: "ID must not contain a tab",
  }),
  idHasCharacter: msg({
    id: "validation.id.hasCharacter",
    message: "ID must not contain the character {character}",
  }),
};

export function validateStringIsNumber(input: string): InputValidationResult {
  return !isNaN(Number(input)) && input.trim() !== ""
    ? { isValid: true }
    : { isValid: false, feedback: FEEDBACK.notANumber };
}

export function validateStringIsNumberOrEmpty(
  input: string,
): InputValidationResult {
  if (input === "") {
    return { isValid: true };
  }

  return !isNaN(Number(input)) && input.trim() !== ""
    ? { isValid: true }
    : { isValid: false, feedback: FEEDBACK.notANumberOrEmpty };
}

export function validateStringIsNumberAndBetweenMinAndMaxOrEmpty(
  input: string,
  minimum?: number,
  maximum?: number,
): InputValidationResult {
  if (input === "") {
    return { isValid: true };
  }

  const defaultResult = validateStringIsNumber(input);
  if (!defaultResult.isValid) {
    return defaultResult;
  }

  // Gotten this far, we know this is a valid number
  const inputAsNum = parseFloat(input);
  if (
    (minimum !== undefined && inputAsNum < minimum) ||
    (maximum !== undefined && inputAsNum > maximum)
  ) {
    return {
      isValid: false,
      feedback: FEEDBACK.outOfRange,
    };
  }

  return { isValid: true };
}

export function validateNewItemId(
  input: string,
  existingItemIds: string[],
): InputValidationResult {
  if (!input) {
    return { isValid: false, feedback: FEEDBACK.idEmpty };
  }

  const invalidCharacter = firstInvalidIdentifierCharacter(input);
  if (invalidCharacter !== undefined) {
    return {
      isValid: false,
      feedback: describeInvalidCharacter(invalidCharacter),
    };
  }

  if (existingItemIds.includes(input)) {
    return {
      isValid: false,
      feedback: FEEDBACK.idNotUnique,
    };
  }

  return { isValid: true };
}

// Names for characters a user cannot see in a way that reads in a message.
function describeInvalidCharacter(character: string): MessageDescriptor {
  switch (character) {
    case " ":
      return FEEDBACK.idHasSpace;
    case "\t":
      return FEEDBACK.idHasTab;
    default:
      return {
        ...FEEDBACK.idHasCharacter,
        values: { character: `"${character}"` },
      };
  }
}

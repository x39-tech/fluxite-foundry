export interface InputValidationResult {
  isValid: boolean;
  feedback?: string;
}

export function validateStringIsNumber(input: string): InputValidationResult {
  return !isNaN(Number(input)) && input.trim() !== ""
    ? { isValid: true }
    : { isValid: false, feedback: "Input must be a valid number" };
}

export function validateStringIsNumberOrEmpty(
  input: string,
): InputValidationResult {
  if (input === "") {
    return { isValid: true };
  }

  return !isNaN(Number(input)) && input.trim() !== ""
    ? { isValid: true }
    : { isValid: false, feedback: "Input must be a valid number or empty" };
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
      feedback: "Input must be between minimum and maximum value",
    };
  }

  return { isValid: true };
}

export function validateNewItemId(
  input: string,
  existingItemIds: string[],
): InputValidationResult {
  if (!input) {
    return { isValid: false, feedback: "ID must not be empty" };
  }

  if (existingItemIds.includes(input)) {
    return {
      isValid: false,
      feedback: "ID must be unique",
    };
  }

  return { isValid: true };
}

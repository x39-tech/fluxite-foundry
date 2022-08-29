export interface InputValidationResult {
  isValid: boolean;
  feedback?: string;
}

export function validateStringIsNumber(input: string): InputValidationResult {
  return !isNaN(parseFloat(input))
    ? { isValid: true }
    : { isValid: false, feedback: "Input must be a valid number" };
}

export function validateStringIsNumberOrEmpty(
  input: string
): InputValidationResult {
  if (input === "") {
    return { isValid: true };
  }

  return !isNaN(parseFloat(input))
    ? { isValid: true }
    : { isValid: false, feedback: "Input must be a valid number or empty" };
}

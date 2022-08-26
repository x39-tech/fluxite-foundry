export interface InputValidationResult {
  isValid: boolean;
  feedback?: string;
}

export function validateStringIsNumber(input: string): InputValidationResult {
  return !isNaN(parseFloat(input))
    ? { isValid: true }
    : { isValid: false, feedback: "Input must be a valid number" };
}

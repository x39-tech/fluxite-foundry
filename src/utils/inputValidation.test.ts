import { describe, it, expect } from "vitest";
import {
  validateStringIsNumber,
  validateStringIsNumberOrEmpty,
  validateStringIsNumberAndBetweenMinAndMaxOrEmpty,
} from "./inputValidation";

describe("validateStringIsNumber", () => {
  it("should accept valid integer strings", () => {
    expect(validateStringIsNumber("123")).toEqual({ isValid: true });
    expect(validateStringIsNumber("0")).toEqual({ isValid: true });
    expect(validateStringIsNumber("-456")).toEqual({ isValid: true });
  });

  it("should accept valid decimal strings", () => {
    expect(validateStringIsNumber("123.45")).toEqual({ isValid: true });
    expect(validateStringIsNumber("-123.45")).toEqual({ isValid: true });
    expect(validateStringIsNumber("0.1")).toEqual({ isValid: true });
    expect(validateStringIsNumber(".5")).toEqual({ isValid: true });
  });

  it("should reject strings with non-numeric characters at the end", () => {
    expect(validateStringIsNumber("1sdf")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
    expect(validateStringIsNumber("123abc")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
  });

  it("should reject empty strings", () => {
    expect(validateStringIsNumber("")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
  });

  it("should reject whitespace-only strings", () => {
    expect(validateStringIsNumber("   ")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
  });

  it("should reject completely invalid strings", () => {
    expect(validateStringIsNumber("abc")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
    expect(validateStringIsNumber("hello")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
  });

  it("should reject strings with non-numeric characters at the beginning", () => {
    expect(validateStringIsNumber("abc123")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
  });

  it("should reject strings with non-numeric characters in the middle", () => {
    expect(validateStringIsNumber("12abc34")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
  });
});

describe("validateStringIsNumberOrEmpty", () => {
  it("should accept empty strings", () => {
    expect(validateStringIsNumberOrEmpty("")).toEqual({ isValid: true });
  });

  it("should accept valid number strings", () => {
    expect(validateStringIsNumberOrEmpty("123")).toEqual({ isValid: true });
    expect(validateStringIsNumberOrEmpty("-456.78")).toEqual({ isValid: true });
  });

  it("should reject strings with non-numeric characters", () => {
    expect(validateStringIsNumberOrEmpty("123abc")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number or empty",
    });
    expect(validateStringIsNumberOrEmpty("1sdf")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number or empty",
    });
  });

  it("should reject whitespace-only strings", () => {
    expect(validateStringIsNumberOrEmpty("   ")).toEqual({
      isValid: false,
      feedback: "Input must be a valid number or empty",
    });
  });
});

describe("validateStringIsNumberAndBetweenMinAndMaxOrEmpty", () => {
  it("should accept empty strings", () => {
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("", 0, 100),
    ).toEqual({ isValid: true });
  });

  it("should accept valid numbers within range", () => {
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("50", 0, 100),
    ).toEqual({ isValid: true });
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("0", 0, 100),
    ).toEqual({ isValid: true });
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("100", 0, 100),
    ).toEqual({ isValid: true });
  });

  it("should reject numbers outside range", () => {
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("-1", 0, 100),
    ).toEqual({
      isValid: false,
      feedback: "Input must be between minimum and maximum value",
    });
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("101", 0, 100),
    ).toEqual({
      isValid: false,
      feedback: "Input must be between minimum and maximum value",
    });
  });

  it("should reject strings with non-numeric characters", () => {
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("50abc", 0, 100),
    ).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("1sdf", 0, 100),
    ).toEqual({
      isValid: false,
      feedback: "Input must be a valid number",
    });
  });

  it("should work with only minimum specified", () => {
    expect(validateStringIsNumberAndBetweenMinAndMaxOrEmpty("50", 10)).toEqual({
      isValid: true,
    });
    expect(validateStringIsNumberAndBetweenMinAndMaxOrEmpty("5", 10)).toEqual({
      isValid: false,
      feedback: "Input must be between minimum and maximum value",
    });
  });

  it("should work with only maximum specified", () => {
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("50", undefined, 100),
    ).toEqual({ isValid: true });
    expect(
      validateStringIsNumberAndBetweenMinAndMaxOrEmpty("150", undefined, 100),
    ).toEqual({
      isValid: false,
      feedback: "Input must be between minimum and maximum value",
    });
  });
});

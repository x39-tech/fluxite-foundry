import { describe, test, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CodexId } from "app/persistentState";
import { resetAllStores } from "test/utils";
import { ResolvedParameterClass } from "../stateTransformations";
import { ParameterClassDisplay } from "./ParameterClassDisplay";

function parameterClass(codexId: string): ResolvedParameterClass {
  return {
    codexId: CodexId(codexId),
    dataType: "number",
    name: { value: "Emitter", desiredLocale: "en-US", locale: "en-US" },
    choices: [],
  };
}

function rowValue(label: string): string | undefined {
  return screen.getByText(label).nextElementSibling?.textContent ?? undefined;
}

describe("ParameterClassDisplay", () => {
  beforeEach(() => {
    resetAllStores();
  });

  test("names the class's category in words alongside its ID", () => {
    render(
      <ParameterClassDisplay paramClass={parameterClass("color/additive/x")} />,
    );

    expect(rowValue("Category")).toBe("Color › Additive");
    expect(rowValue("ID")).toBe("x");
  });

  test("says nothing about a category for a class that has none", () => {
    render(
      <ParameterClassDisplay paramClass={parameterClass("uncategorized")} />,
    );

    expect(screen.queryByText("Category")).not.toBeInTheDocument();
  });
});

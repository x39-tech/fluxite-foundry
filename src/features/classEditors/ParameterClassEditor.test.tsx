import { describe, test, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  CodexId,
  EntityId,
  LocalizationDbSchema,
  LocalizationKey,
} from "app/persistentState";
import { resetAllStores, createEmptyDeviceClassEditor } from "test/utils";
import { updateCurrentEditor } from "features/deviceClassEditor/state";
import { DeviceClassClassEditing } from "features/deviceClassEditor/classEditing";
import { ParameterClassEditor } from "./ParameterClassEditor";

const CLASS_ID = EntityId("test-parameter-class");
const NAME_KEY = LocalizationKey("test-parameter-class-name");

function createTestParameterClass() {
  updateCurrentEditor("Add test parameter class", (draft) => {
    draft.localizations[NAME_KEY] = {
      strings: LocalizationDbSchema.parse({ "en-US": "Mode" }),
    };
    draft.parameterClasses[CLASS_ID] = {
      codexId: CodexId("mode"),
      dataType: "number",
      localized: { name: NAME_KEY },
    };
  });
}

function renderEditor() {
  return render(
    <DeviceClassClassEditing>
      <ParameterClassEditor id={CLASS_ID} />
    </DeviceClassClassEditing>,
  );
}

async function selectOption(
  user: ReturnType<typeof userEvent.setup>,
  comboboxName: string,
  optionName: string,
) {
  await user.click(screen.getByRole("combobox", { name: comboboxName }));
  await user.click(await screen.findByRole("option", { name: optionName }));
}

describe("ParameterClassEditor", () => {
  beforeEach(() => {
    resetAllStores();
    createEmptyDeviceClassEditor();
    createTestParameterClass();
  });

  test("only offers enum choices once the data type is enum", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.queryByText("Enum Choices")).not.toBeInTheDocument();

    await selectOption(user, "Data Type", "enum");

    expect(screen.getByText("Enum Choices")).toBeInTheDocument();
  });

  test("adds and removes enum choices", async () => {
    const user = userEvent.setup();
    renderEditor();

    await selectOption(user, "Data Type", "enum");
    await user.click(screen.getByRole("button", { name: "Add Enum Choice" }));

    const choiceId = screen.getByRole("textbox", { name: "Choice ID" });
    expect(choiceId).toHaveValue("new-choice");
    expect(screen.getByRole("textbox", { name: "Choice name" })).toHaveValue(
      "New Choice",
    );

    await user.clear(choiceId);
    await user.type(choiceId, "open{Enter}");
    expect(screen.getByRole("textbox", { name: "Choice ID" })).toHaveValue(
      "open",
    );

    await user.click(
      screen.getByRole("button", { name: "Delete choice open" }),
    );
    expect(
      screen.queryByRole("textbox", { name: "Choice ID" }),
    ).not.toBeInTheDocument();
  });

  test("only offers a unit exponent once a unit is set", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(
      screen.queryByRole("textbox", { name: "Unit exponent" }),
    ).not.toBeInTheDocument();

    await selectOption(user, "Unit", "degree");
    expect(
      screen.getByRole("textbox", { name: "Unit exponent" }),
    ).toBeInTheDocument();

    await selectOption(user, "Unit", "Not specified");
    expect(
      screen.queryByRole("textbox", { name: "Unit exponent" }),
    ).not.toBeInTheDocument();
  });

  test("keeps a unit exponent alongside the unit name", async () => {
    const user = userEvent.setup();
    renderEditor();

    await selectOption(user, "Unit", "meter");

    const exponent = screen.getByRole("textbox", { name: "Unit exponent" });
    await user.type(exponent, "-3{Enter}");

    expect(screen.getByRole("textbox", { name: "Unit exponent" })).toHaveValue(
      "-3",
    );
  });
});

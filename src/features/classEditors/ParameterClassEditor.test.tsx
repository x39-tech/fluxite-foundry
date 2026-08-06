import { describe, test, expect, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toaster } from "components/scn-ui/Sonner";
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
const OTHER_CLASS_ID = EntityId("other-parameter-class");
const OTHER_NAME_KEY = LocalizationKey("other-parameter-class-name");

function createTestParameterClass() {
  updateCurrentEditor("Add test parameter class", (draft) => {
    draft.localizations[NAME_KEY] = {
      strings: LocalizationDbSchema.parse({ "en-US": "Mode" }),
    };
    draft.parameterClasses[CLASS_ID] = {
      codexId: CodexId("intensity/dimmer"),
      dataType: "number",
      localized: { name: NAME_KEY },
    };
  });
}

/** A second class, for the uniqueness checking. */
function createOtherParameterClass(codexId: string) {
  updateCurrentEditor("Add other parameter class", (draft) => {
    draft.localizations[OTHER_NAME_KEY] = {
      strings: LocalizationDbSchema.parse({ "en-US": "Other" }),
    };
    draft.parameterClasses[OTHER_CLASS_ID] = {
      codexId: CodexId(codexId),
      dataType: "number",
      localized: { name: OTHER_NAME_KEY },
    };
  });
}

// The Toaster goes along, since a rejected ID change is reported in one.
function renderEditor() {
  return render(
    <DeviceClassClassEditing>
      <ParameterClassEditor id={CLASS_ID} />
      <Toaster />
    </DeviceClassClassEditing>,
  );
}

/** Picks a category in the picker by its identifier. */
async function chooseCategory(
  user: ReturnType<typeof userEvent.setup>,
  category: string,
) {
  await user.click(screen.getByRole("combobox", { name: "Category" }));
  await user.type(
    screen.getByPlaceholderText("Search categories..."),
    category,
  );

  const option = (await screen.findAllByRole("option")).find((candidate) =>
    within(candidate).queryByText(category, { exact: true }),
  );
  if (!option) {
    throw new Error(`The category ${category} was not offered`);
  }

  await user.click(option);
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

  test("edits the category and the identifier in fields of their own", () => {
    renderEditor();

    expect(
      screen.getByRole("combobox", { name: "Category" }),
    ).toHaveTextContent("Intensity");
    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue("dimmer");
    expect(screen.getByText("intensity/dimmer")).toBeInTheDocument();
  });

  test("keeps the category when the identifier changes", async () => {
    const user = userEvent.setup();
    renderEditor();

    const idField = screen.getByRole("textbox", { name: "ID" });
    await user.clear(idField);
    await user.type(idField, "shutter{Enter}");

    expect(screen.getByText("intensity/shutter")).toBeInTheDocument();
  });

  test("keeps the identifier when the category changes", async () => {
    const user = userEvent.setup();
    renderEditor();

    await chooseCategory(user, "color/additive");

    expect(screen.getByText("color/additive/dimmer")).toBeInTheDocument();
  });

  test("refuses an identifier that is not legal in the standard", async () => {
    const user = userEvent.setup();
    renderEditor();

    const idField = screen.getByRole("textbox", { name: "ID" });
    await user.clear(idField);
    await user.type(idField, "dim/mer");

    // The path separator is what divides a category from an identifier, so it
    // cannot appear inside one.
    expect(
      await screen.findByText(/must not contain "\/"/),
    ).toBeInTheDocument();

    await user.type(idField, "{Enter}");
    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue("dimmer");
    expect(screen.getByText("intensity/dimmer")).toBeInTheDocument();
  });

  test("refuses a category that would collide with another class", async () => {
    createOtherParameterClass("color/additive/dimmer");
    const user = userEvent.setup();
    renderEditor();

    await chooseCategory(user, "color/additive");

    expect(
      await screen.findByText(/color\/additive\/dimmer already exists/),
    ).toBeInTheDocument();
    expect(screen.getByText("intensity/dimmer")).toBeInTheDocument();
  });

  test("allows an identifier another category already uses", async () => {
    createOtherParameterClass("color/additive/dimmer");
    const user = userEvent.setup();
    renderEditor();

    // Identifiers only have to be unique within their own category.
    const idField = screen.getByRole("textbox", { name: "ID" });
    await user.clear(idField);
    await user.type(idField, "dimmer{Enter}");

    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue("dimmer");
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

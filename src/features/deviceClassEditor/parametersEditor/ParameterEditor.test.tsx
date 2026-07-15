import { render, screen, within } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ParameterEditor } from "./ParameterEditor";
import { createDeviceClassEditor } from "features/topNavBar/state";
import { createNewParameter, useParameters } from "./state";
import { updateCurrentEditor } from "../state";
import {
  LocalizationKey,
  EntityId,
  CodexId,
  LocalizationDbSchema,
} from "app/persistentState";

// Helper to get the current hook value
function getHookValue<T>(hook: () => T): T {
  const { result } = renderHook(hook);
  return result.current;
}

// Creates a parameter class in the current editor, along with a class-level enum
// choice for each of the given choice names.
function createParameterClass(
  codexId: string,
  dataType: "number" | "enum",
  choiceNames: string[] = [],
) {
  updateCurrentEditor((editor) => {
    const classNameKey = LocalizationKey(`${codexId}_name`);
    editor.localizations[classNameKey] = {
      strings: LocalizationDbSchema.parse({ "en-US": codexId }),
      items: [],
    };

    const classId = EntityId(codexId);
    editor.parameterClasses[classId] = {
      codexId: CodexId(codexId),
      dataType,
      localized: {
        name: classNameKey,
      },
    };

    choiceNames.forEach((choiceName, index) => {
      const choiceId = `choice${index + 1}`;
      const choiceNameKey = LocalizationKey(`${choiceId}_name`);
      editor.localizations[choiceNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": choiceName }),
        items: [],
      };

      editor.enumChoices[EntityId(choiceId)] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId(choiceId),
        index,
        localized: { name: choiceNameKey },
      };
    });
  });
}

// Helper to create a parameter and return its EntityId
function createParameterAndGetId(
  library: string | undefined,
  paramClass: CodexId,
  codexId: CodexId,
): EntityId {
  createNewParameter(library, paramClass, codexId);
  const params = getHookValue(useParameters);
  // Find the parameter with the matching codexId
  const paramEntry = Object.entries(params || {}).find(
    ([_, param]) => param.codexId === codexId,
  );
  if (!paramEntry) {
    throw new Error(`Parameter with codexId ${codexId} not found`);
  }
  return EntityId(paramEntry[0]);
}

beforeEach(() => {
  createDeviceClassEditor();
});

describe("Enum Parameter Editing", () => {
  test("renders enum choices editor for enum parameters", async () => {
    createParameterClass("TestEnumClass", "enum", ["Choice 1", "Choice 2"]);

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestEnumClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor id={paramId} />);

    // Verify enum choices editor is rendered
    expect(screen.getByText("Enum Choices")).toBeInTheDocument();
  });

  test("does not render enum choices editor for non-enum parameters", async () => {
    createParameterClass("TestNumberClass", "number");

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestNumberClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor id={paramId} />);

    // Verify enum choices editor is NOT rendered
    expect(screen.queryByText("Enum Choices")).not.toBeInTheDocument();
  });

  test("displays class choices in enum editor", async () => {
    const user = userEvent.setup();

    createParameterClass("TestEnumClass", "enum", [
      "Choice 1",
      "Choice 2",
      "Choice 3",
    ]);

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestEnumClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor id={paramId} />);

    // Open the View dropdown to see the choices
    const viewButton = screen.getByRole("button", { name: "View" });
    await user.click(viewButton);

    // Verify all class choices are displayed in the dropdown
    expect(screen.getByText(/0: Choice 1/)).toBeInTheDocument();
    expect(screen.getByText(/1: Choice 2/)).toBeInTheDocument();
    expect(screen.getByText(/2: Choice 3/)).toBeInTheDocument();
  });

  test("can exclude class choices", async () => {
    const user = userEvent.setup();

    createParameterClass("TestEnumClass", "enum", ["Choice 1", "Choice 2"]);

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestEnumClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor id={paramId} />);

    // Click the Modify button to open the dialog
    const modifyButton = screen.getByRole("button", { name: "Modify" });
    await user.click(modifyButton);

    // Find the choice row by ID
    const choice1Cell = await screen.findByText("choice1");
    const choice1Row = choice1Cell.closest("tr")!;
    const withinRow = within(choice1Row);
    const excludeCheckbox = withinRow.getByRole("checkbox");

    // Checkbox should be checked initially (included)
    expect(excludeCheckbox).toBeChecked();

    // Click to exclude the choice
    await user.click(excludeCheckbox);

    // Checkbox should now be unchecked (excluded)
    expect(excludeCheckbox).not.toBeChecked();
  });

  test("can add instance choices", async () => {
    const user = userEvent.setup();

    createParameterClass("TestEnumClass", "enum", ["Choice 1"]);

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestEnumClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor id={paramId} />);

    // Click the Modify button to open the dialog
    const modifyButton = screen.getByRole("button", { name: "Modify" });
    await user.click(modifyButton);

    // Find and click the "Add" button (it has an empty accessible name)
    const addButton = await screen.findByRole("button", { name: "" });
    await user.click(addButton);

    // Verify new row was added with default values
    const dialog = screen.getByRole("dialog");
    const inputs = within(dialog).getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(inputs[0]).toHaveValue("new-choice");
    expect(inputs[1]).toHaveValue("New Choice");
  });
});

describe("Parameter Basic Properties", () => {
  test("renders parameter ID and display name field", async () => {
    createParameterClass("TestClass", "number");

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestClass"),
      CodexId("test-param-id"),
    );

    render(<ParameterEditor id={paramId} />);

    // Verify ID field is rendered with correct value
    expect(screen.getByRole("textbox", { name: "ID" })).toHaveValue(
      "test-param-id",
    );

    // Verify Display Name field exists (but is empty by default)
    expect(screen.getByRole("textbox", { name: "Display Name" })).toHaveValue(
      "",
    );
  });

  test("renders library information", async () => {
    createParameterClass("TestClass", "number");

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor id={paramId} />);

    // Should show "Device Library" for parameters without a library
    expect(screen.getByRole("textbox", { name: "Library" })).toHaveValue(
      "Device Library",
    );
  });

  test("renders parameter class", async () => {
    createParameterClass("TestClass", "number");

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor id={paramId} />);

    expect(screen.getByRole("textbox", { name: "Class" })).toHaveValue(
      "TestClass",
    );
  });

  test("updating display name works properly", async () => {
    const user = userEvent.setup();

    createParameterClass("TestClass", "number");

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestClass"),
      CodexId("blank-test-param"),
    );

    render(<ParameterEditor id={paramId} />);

    // First, set a display name
    const displayNameInput = screen.getByRole("textbox", {
      name: "Display Name",
    });
    await user.type(displayNameInput, "Initial Name{Enter}");

    // Verify the display name was set
    expect(displayNameInput).toHaveValue("Initial Name");

    // Now clear it
    await user.clear(displayNameInput);
    await user.type(displayNameInput, "{Enter}");

    // After clearing and confirming, the parameter should still be accessible by its codexId
    // and the localization key should not be visible
    const params = getHookValue(useParameters);
    const param = params?.[paramId];
    expect(param).toBeDefined();
    expect(param?.localized.friendlyName).toBeUndefined();
  });
});

describe("Min/Max/Default for Number Parameters", () => {
  test("renders min/max/default fields for number parameters", async () => {
    createParameterClass("NumberClass", "number");

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("NumberClass"),
      CodexId("number-param"),
    );

    render(<ParameterEditor id={paramId} />);

    expect(
      screen.getByRole("textbox", { name: "Minimum Value" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Maximum Value" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Default Value" }),
    ).toBeInTheDocument();
  });

  test("does not render min/max/default fields for enum parameters", async () => {
    createParameterClass("EnumClass", "enum");

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("EnumClass"),
      CodexId("enum-param"),
    );

    render(<ParameterEditor id={paramId} />);

    expect(screen.queryByText("Minimum Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Maximum Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Default Value")).not.toBeInTheDocument();
  });
});

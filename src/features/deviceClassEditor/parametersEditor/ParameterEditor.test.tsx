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

// Helper to expand a parameter editor
async function expandParameter(parameterName: string) {
  const user = userEvent.setup();
  const expandButton = screen.getByRole("button", {
    name: `Expand ${parameterName}`,
  });
  await user.click(expandButton);
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
    // Create an enum parameter class
    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_enum_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Enum" }),
        items: [],
      };

      const classId = EntityId("TestEnumClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestEnumClass"),
        dataType: "enum",
        localized: {
          name: classNameKey,
        },
      };

      // Add enum choices for the class
      const choice1Key = LocalizationKey("choice1_name");
      const choice2Key = LocalizationKey("choice2_name");
      editor.localizations[choice1Key] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Choice 1" }),
        items: [],
      };
      editor.localizations[choice2Key] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Choice 2" }),
        items: [],
      };

      editor.enumChoices[EntityId("choice1")] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId("choice1"),
        index: 0,
        localized: { name: choice1Key },
      };
      editor.enumChoices[EntityId("choice2")] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId("choice2"),
        index: 1,
        localized: { name: choice2Key },
      };
    });

    // Add a parameter using that class
    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestEnumClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param");

    // Verify enum choices editor is rendered
    expect(screen.getByText("Enum Choices")).toBeInTheDocument();
  });

  test("does not render enum choices editor for non-enum parameters", async () => {
    // Create a number parameter class
    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_number_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Number" }),
        items: [],
      };

      const classId = EntityId("TestNumberClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestNumberClass"),
        dataType: "number",
        localized: {
          name: classNameKey,
        },
      };
    });

    // Add a parameter using that class
    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestNumberClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param");

    // Verify enum choices editor is NOT rendered
    expect(screen.queryByText("Enum Choices")).not.toBeInTheDocument();
  });

  test("displays class choices in enum editor", async () => {
    const user = userEvent.setup();

    // Create an enum parameter class with choices
    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_enum_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Enum" }),
        items: [],
      };

      const classId = EntityId("TestEnumClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestEnumClass"),
        dataType: "enum",
        localized: {
          name: classNameKey,
        },
      };

      // Add enum choices for the class
      const choice1Key = LocalizationKey("choice1_name");
      const choice2Key = LocalizationKey("choice2_name");
      const choice3Key = LocalizationKey("choice3_name");

      editor.localizations[choice1Key] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Choice 1" }),
        items: [],
      };
      editor.localizations[choice2Key] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Choice 2" }),
        items: [],
      };
      editor.localizations[choice3Key] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Choice 3" }),
        items: [],
      };

      editor.enumChoices[EntityId("choice1")] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId("choice1"),
        index: 0,
        localized: { name: choice1Key },
      };
      editor.enumChoices[EntityId("choice2")] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId("choice2"),
        index: 1,
        localized: { name: choice2Key },
      };
      editor.enumChoices[EntityId("choice3")] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId("choice3"),
        index: 2,
        localized: { name: choice3Key },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestEnumClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param");

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

    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_enum_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Enum" }),
        items: [],
      };

      const classId = EntityId("TestEnumClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestEnumClass"),
        dataType: "enum",
        localized: {
          name: classNameKey,
        },
      };

      // Add enum choices for the class
      const choice1Key = LocalizationKey("choice1_name");
      const choice2Key = LocalizationKey("choice2_name");

      editor.localizations[choice1Key] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Choice 1" }),
        items: [],
      };
      editor.localizations[choice2Key] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Choice 2" }),
        items: [],
      };

      editor.enumChoices[EntityId("choice1")] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId("choice1"),
        index: 0,
        localized: { name: choice1Key },
      };
      editor.enumChoices[EntityId("choice2")] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId("choice2"),
        index: 1,
        localized: { name: choice2Key },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestEnumClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param");

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

    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_enum_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Enum" }),
        items: [],
      };

      const classId = EntityId("TestEnumClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestEnumClass"),
        dataType: "enum",
        localized: {
          name: classNameKey,
        },
      };

      // Add one enum choice for the class
      const choice1Key = LocalizationKey("choice1_name");
      editor.localizations[choice1Key] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Choice 1" }),
        items: [],
      };

      editor.enumChoices[EntityId("choice1")] = {
        parent: { type: "paramClass", id: classId },
        codexId: CodexId("choice1"),
        index: 0,
        localized: { name: choice1Key },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestEnumClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param");

    // Click the Modify button to open the dialog
    const modifyButton = screen.getByRole("button", { name: "Modify" });
    await user.click(modifyButton);

    // Find and click the "Add" button (it has an empty accessible name)
    const addButton = await screen.findByRole("button", { name: "" });
    await user.click(addButton);

    // Verify new row was added with default values
    const inputs = screen.getAllByRole("textbox");
    expect(inputs.length).toBeGreaterThanOrEqual(2);
    expect(inputs[0]).toHaveValue("new-choice");
    expect(inputs[1]).toHaveValue("New Choice");
  });
});

describe("Parameter Basic Properties", () => {
  test("renders parameter ID and display name field", async () => {
    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Class" }),
        items: [],
      };

      const classId = EntityId("TestClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestClass"),
        dataType: "number",
        localized: {
          name: classNameKey,
        },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestClass"),
      CodexId("test-param-id"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param-id");

    // Verify ID field is rendered with correct value
    expect(screen.getByDisplayValue("test-param-id")).toBeInTheDocument();

    // Verify Display Name field exists (but is empty by default)
    const displayNameRow = screen.getByText("Display Name").closest("tr")!;
    const displayNameInput = within(displayNameRow).getByRole("textbox");
    expect(displayNameInput).toBeInTheDocument();
    expect(displayNameInput).toHaveValue("");
  });

  test("renders library information", async () => {
    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Class" }),
        items: [],
      };

      const classId = EntityId("TestClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestClass"),
        dataType: "number",
        localized: {
          name: classNameKey,
        },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param");

    // Should show "Device Library" for parameters without a library
    expect(screen.getByText("Device Library")).toBeInTheDocument();
  });

  test("renders parameter class", async () => {
    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Class" }),
        items: [],
      };

      const classId = EntityId("TestClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestClass"),
        dataType: "number",
        localized: {
          name: classNameKey,
        },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param");

    expect(screen.getByText("TestClass")).toBeInTheDocument();
  });

  test("updating display name works properly", async () => {
    const user = userEvent.setup();

    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("test_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Test Class" }),
        items: [],
      };

      const classId = EntityId("TestClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("TestClass"),
        dataType: "number",
        localized: {
          name: classNameKey,
        },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("TestClass"),
      CodexId("blank-test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("blank-test-param");

    // First, set a display name
    const displayNameRow = screen.getByText("Display Name").closest("tr")!;
    const displayNameInput = within(displayNameRow).getByRole("textbox");
    await user.type(displayNameInput, "Initial Name{Enter}");

    // Verify the display name was set
    expect(screen.getByDisplayValue("Initial Name")).toBeInTheDocument();

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
    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("number_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Number Class" }),
        items: [],
      };

      const classId = EntityId("NumberClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("NumberClass"),
        dataType: "number",
        localized: {
          name: classNameKey,
        },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("NumberClass"),
      CodexId("number-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("number-param");

    expect(screen.getByText("Minimum Value")).toBeInTheDocument();
    expect(screen.getByText("Maximum Value")).toBeInTheDocument();
    expect(screen.getByText("Default Value")).toBeInTheDocument();
  });

  test("does not render min/max/default fields for enum parameters", async () => {
    updateCurrentEditor((editor) => {
      const classNameKey = LocalizationKey("enum_class_name");
      editor.localizations[classNameKey] = {
        strings: LocalizationDbSchema.parse({ "en-US": "Enum Class" }),
        items: [],
      };

      const classId = EntityId("EnumClass");
      editor.parameterClasses[classId] = {
        codexId: CodexId("EnumClass"),
        dataType: "enum",
        localized: {
          name: classNameKey,
        },
      };
    });

    const paramId = createParameterAndGetId(
      undefined,
      CodexId("EnumClass"),
      CodexId("enum-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("enum-param");

    expect(screen.queryByText("Minimum Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Maximum Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Default Value")).not.toBeInTheDocument();
  });
});

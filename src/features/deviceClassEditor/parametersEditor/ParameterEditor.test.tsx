import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataType } from "e173";
import { ParameterEditor } from "./ParameterEditor";
import { createDeviceClassEditor } from "features/topNavBar/state";
import { createNewParameter } from "./state";
import { updateCurrentEditor } from "../state";

// Helper to expand a parameter editor
async function expandParameter(parameterName: string) {
  const user = userEvent.setup();
  const expandButton = screen.getByRole("button", {
    name: `Expand ${parameterName}`,
  });
  await user.click(expandButton);
}

beforeEach(() => {
  createDeviceClassEditor();
});

describe("Enum Parameter Editing", () => {
  test("renders enum choices editor for enum parameters", async () => {
    // Create an enum parameter class
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["choice1_name"] = "Choice 1";
      strings["choice2_name"] = "Choice 2";
      strings["test_enum_name"] = "Test Enum";

      editor.deviceLibrary.parameterClasses = {
        TestEnumClass: {
          "@name": "test_enum_name",
          dataType: DataType.Enum,
          choices: [
            { id: "choice1", "@name": "choice1_name" },
            { id: "choice2", "@name": "choice2_name" },
          ],
        },
      };
    });

    // Add a parameter using that class
    createNewParameter(
      undefined,
      "TestEnumClass",
      "test-param",
      "Test Enum Parameter",
    );

    render(<ParameterEditor id="test-param" />);
    await expandParameter("Test Enum Parameter");

    // Verify enum choices editor is rendered
    expect(screen.getByText("Enum Choices")).toBeInTheDocument();
  });

  test("does not render enum choices editor for non-enum parameters", async () => {
    // Create a number parameter class
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["test_number_name"] = "Test Number";

      editor.deviceLibrary.parameterClasses = {
        TestNumberClass: {
          "@name": "test_number_name",
          dataType: DataType.Number,
        },
      };
    });

    // Add a parameter using that class
    createNewParameter(
      undefined,
      "TestNumberClass",
      "test-param",
      "Test Number Parameter",
    );

    render(<ParameterEditor id="test-param" />);
    await expandParameter("Test Number Parameter");

    // Verify enum choices editor is NOT rendered
    expect(screen.queryByText("Enum Choices")).not.toBeInTheDocument();
  });

  test("displays class choices in enum editor", async () => {
    const user = userEvent.setup();

    // Create an enum parameter class with choices
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["choice1_name"] = "Choice 1";
      strings["choice2_name"] = "Choice 2";
      strings["choice3_name"] = "Choice 3";
      strings["test_enum_name"] = "Test Enum";

      editor.deviceLibrary.parameterClasses = {
        TestEnumClass: {
          "@name": "test_enum_name",
          dataType: DataType.Enum,
          choices: [
            { id: "choice1", "@name": "choice1_name" },
            { id: "choice2", "@name": "choice2_name" },
            { id: "choice3", "@name": "choice3_name" },
          ],
        },
      };
    });

    createNewParameter(undefined, "TestEnumClass", "test-param", "Test Enum");

    render(<ParameterEditor id="test-param" />);
    await expandParameter("Test Enum");

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
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["choice1_name"] = "Choice 1";
      strings["choice2_name"] = "Choice 2";
      strings["test_enum_name"] = "Test Enum";

      editor.deviceLibrary.parameterClasses = {
        TestEnumClass: {
          "@name": "test_enum_name",
          dataType: DataType.Enum,
          choices: [
            { id: "choice1", "@name": "choice1_name" },
            { id: "choice2", "@name": "choice2_name" },
          ],
        },
      };
    });

    createNewParameter(undefined, "TestEnumClass", "test-param", "Test Enum");

    render(<ParameterEditor id="test-param" />);
    await expandParameter("Test Enum");

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
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["choice1_name"] = "Choice 1";
      strings["test_enum_name"] = "Test Enum";

      editor.deviceLibrary.parameterClasses = {
        TestEnumClass: {
          "@name": "test_enum_name",
          dataType: DataType.Enum,
          choices: [{ id: "choice1", "@name": "choice1_name" }],
        },
      };
    });

    createNewParameter(undefined, "TestEnumClass", "test-param", "Test Enum");

    render(<ParameterEditor id="test-param" />);
    await expandParameter("Test Enum");

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
  test("renders parameter ID and display name", async () => {
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["test_class_name"] = "Test Class";

      editor.deviceLibrary.parameterClasses = {
        TestClass: {
          "@name": "test_class_name",
          dataType: DataType.Number,
        },
      };
    });

    createNewParameter(
      undefined,
      "TestClass",
      "test-param-id",
      "Test Parameter Name",
    );

    render(<ParameterEditor id="test-param-id" />);
    await expandParameter("Test Parameter Name");

    expect(screen.getByDisplayValue("test-param-id")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Parameter Name")).toBeInTheDocument();
  });

  test("renders library information", async () => {
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["test_class_name"] = "Test Class";

      editor.deviceLibrary.parameterClasses = {
        TestClass: {
          "@name": "test_class_name",
          dataType: DataType.Number,
        },
      };
    });

    createNewParameter(undefined, "TestClass", "test-param", "Test");

    render(<ParameterEditor id="test-param" />);
    await expandParameter("Test");

    // Should show "Device Library" for parameters without a library
    expect(screen.getByText("Device Library")).toBeInTheDocument();
  });

  test("renders parameter class", async () => {
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["test_class_name"] = "Test Class";

      editor.deviceLibrary.parameterClasses = {
        TestClass: {
          "@name": "test_class_name",
          dataType: DataType.Number,
        },
      };
    });

    createNewParameter(undefined, "TestClass", "test-param", "Test");

    render(<ParameterEditor id="test-param" />);
    await expandParameter("Test");

    expect(screen.getByText("TestClass")).toBeInTheDocument();
  });
});

describe("Min/Max/Default for Number Parameters", () => {
  test("renders min/max/default fields for number parameters", async () => {
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["number_class_name"] = "Number Class";

      editor.deviceLibrary.parameterClasses = {
        NumberClass: {
          "@name": "number_class_name",
          dataType: DataType.Number,
        },
      };
    });

    createNewParameter(
      undefined,
      "NumberClass",
      "number-param",
      "Number Param",
    );

    render(<ParameterEditor id="number-param" />);
    await expandParameter("Number Param");

    expect(screen.getByText("Minimum Value")).toBeInTheDocument();
    expect(screen.getByText("Maximum Value")).toBeInTheDocument();
    expect(screen.getByText("Default Value")).toBeInTheDocument();
  });

  test("does not render min/max/default fields for enum parameters", async () => {
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["enum_class_name"] = "Enum Class";

      editor.deviceLibrary.parameterClasses = {
        EnumClass: {
          "@name": "enum_class_name",
          dataType: DataType.Enum,
          choices: [],
        },
      };
    });

    createNewParameter(undefined, "EnumClass", "enum-param", "Enum Param");

    render(<ParameterEditor id="enum-param" />);
    await expandParameter("Enum Param");

    expect(screen.queryByText("Minimum Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Maximum Value")).not.toBeInTheDocument();
    expect(screen.queryByText("Default Value")).not.toBeInTheDocument();
  });
});

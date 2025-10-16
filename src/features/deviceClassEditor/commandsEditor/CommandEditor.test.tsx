import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DataType, UnitName } from "e173";
import { describe, it, expect, beforeEach } from "vitest";
import { CommandEditor } from "./CommandEditor";
import { createDeviceClassEditor } from "features/topNavBar/state";
import { createNewCommand } from "./state";
import { updateCurrentEditor } from "../state";

beforeEach(() => {
  createDeviceClassEditor();

  // Add test command classes to the device library with proper localizations
  updateCurrentEditor((editor) => {
    // Add localization strings
    editor.localizations["en-US"] ||= { strings: {} };
    const strings = editor.localizations["en-US"].strings!;

    strings["set_power_name"] = "Set Power";
    strings["set_power_desc"] = "Sets the power state";
    strings["set_power_state_name"] = "State";
    strings["set_power_state_desc"] = "Power state";
    strings["get_status_name"] = "Get Status";
    strings["get_status_desc"] = "Gets the current status";
    strings["get_status_return_name"] = "Status";
    strings["get_status_return_desc"] = "Current status";

    // Add command classes
    editor.deviceLibrary.commandClasses = {
      SetPower: {
        "@name": "set_power_name",
        "@description": "set_power_desc",
        arguments: {
          state: {
            "@name": "set_power_state_name",
            "@description": "set_power_state_desc",
            dataType: DataType.Boolean,
            required: true,
          },
        },
      },
      GetStatus: {
        "@name": "get_status_name",
        "@description": "get_status_desc",
        returns: {
          status: {
            "@name": "get_status_return_name",
            "@description": "get_status_return_desc",
            dataType: DataType.String,
            required: true,
          },
        },
      },
    };
  });
});

describe("CommandEditor", () => {
  describe("basic rendering", () => {
    it("should render error when command does not exist", () => {
      render(<CommandEditor id="non-existent-command" />);
      expect(screen.getByText("Something has gone wrong!")).toBeInTheDocument();
    });

    it("should display command metadata fields", () => {
      // Create a command with a class from the default library
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      expect(screen.getByLabelText("Library")).toBeInTheDocument();
      expect(screen.getByLabelText("Class")).toBeInTheDocument();
      expect(screen.getByLabelText("ID")).toBeInTheDocument();
      expect(screen.getByLabelText("Display Name")).toBeInTheDocument();
      expect(
        screen.getByRole("checkbox", {
          name: "Supports Completion Notification",
        }),
      ).toBeInTheDocument();
    });

    it("should display library as 'Device Library' when library is not set", () => {
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      const libraryInput = screen.getByLabelText("Library");
      expect(libraryInput).toHaveValue("Device Library");
      expect(libraryInput).toBeDisabled();
    });

    it("should display the command ID and display name", () => {
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      expect(screen.getByLabelText("ID")).toHaveValue("set-power");
      expect(screen.getByLabelText("Display Name")).toHaveValue("Set Power");
    });
  });

  describe("completion notification", () => {
    it("should allow toggling completion notification for commands without return values", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      const checkbox = screen.getByRole("checkbox", {
        name: "Supports Completion Notification",
      });
      expect(checkbox).not.toBeDisabled();
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    // Note: Testing auto-enable for commands with return values would require
    // mocking a command class with returns, which depends on the UDR database structure
  });

  describe("editing command metadata", () => {
    it("should allow changing the command ID", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      const { rerender } = render(<CommandEditor id="set-power" />);

      const idInput = screen.getByLabelText("ID");
      await user.click(idInput);
      await user.clear(idInput);
      await user.type(idInput, "new-power-command");
      await user.keyboard("{Enter}");

      // Re-render with the new ID to verify the command exists
      rerender(<CommandEditor id="new-power-command" />);

      // Verify the editor renders with the new ID and correct class
      expect(screen.getByLabelText("ID")).toHaveValue("new-power-command");
      expect(screen.getByLabelText("Class")).toHaveValue("SetPower");
    });

    it("should allow changing the display name", async () => {
      const user = userEvent.setup();
      createNewCommand("", "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      const nameInput = screen.getByLabelText("Display Name");
      await user.click(nameInput);
      await user.clear(nameInput);
      await user.type(nameInput, "Turn On Power");
      await user.keyboard("{Enter}");

      // Verify the name was updated by checking the input value
      expect(screen.getByLabelText("Display Name")).toHaveValue(
        "Turn On Power",
      );
    });

    it("should validate command ID to prevent duplicates", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetPower", "command-1", "Command 1");
      createNewCommand(undefined, "SetPower", "command-2", "Command 2");

      render(<CommandEditor id="command-1" />);

      const idInput = screen.getByLabelText("ID");
      await user.click(idInput);
      await user.clear(idInput);
      await user.type(idInput, "command-2");

      // The validation error should appear after typing but before confirming
      // Check if aria-invalid is set or if validation message appears
      expect(
        await screen.findByText("ID must be unique", {}, { timeout: 3000 }),
      ).toBeInTheDocument();
    });
  });

  describe("arguments display", () => {
    it("should display Arguments section", () => {
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      expect(screen.getByText("Arguments")).toBeInTheDocument();
    });

    it("should display argument details from command class", () => {
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      // Find the argument container to scope queries
      const stateArgHeading = screen.getByText("state");
      const argContainer = stateArgHeading.parentElement!;
      const withinArg = within(argContainer);

      // Should show argument name
      expect(withinArg.getByText("State")).toBeInTheDocument();

      // Verify labels are properly associated with their values
      expect(withinArg.getByLabelText("Data Type")).toHaveTextContent(
        "boolean",
      );
      expect(withinArg.getByLabelText("Required")).toHaveTextContent("Yes");
    });

    it("should display argument description in tooltip", () => {
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      // The description "Power state" should be in a tooltip
      // The question mark icon should be present
      const tooltipTriggers = screen.getAllByRole("button");
      const questionMarkButton = tooltipTriggers.find((btn) =>
        btn.querySelector('svg[data-slot="icon"]'),
      );
      expect(questionMarkButton).toBeInTheDocument();
    });

    it("should display No for non-required arguments", () => {
      // Add a command class with a non-required argument
      updateCurrentEditor((editor) => {
        editor.localizations["en-US"].strings!["optional_cmd_name"] =
          "Optional Command";
        editor.localizations["en-US"].strings!["optional_arg_name"] =
          "Optional Arg";

        editor.deviceLibrary.commandClasses!.OptionalCommand = {
          "@name": "optional_cmd_name",
          arguments: {
            optArg: {
              "@name": "optional_arg_name",
              dataType: DataType.String,
              required: false,
            },
          },
        };
      });

      createNewCommand(undefined, "OptionalCommand", "opt-cmd", "Optional Cmd");

      render(<CommandEditor id="opt-cmd" />);

      // Find the argument container to scope the query
      const optArgHeading = screen.getByText("optArg");
      const argContainer = optArgHeading.parentElement!;
      const withinArg = within(argContainer);

      // Verify the Required field shows "No"
      expect(withinArg.getByLabelText("Required")).toHaveTextContent("No");
    });

    it("should display unit when argument has a unit", () => {
      // Add a command class with an argument that has a unit
      updateCurrentEditor((editor) => {
        editor.localizations["en-US"].strings!["set_temp_name"] =
          "Set Temperature";
        editor.localizations["en-US"].strings!["temp_arg_name"] = "Temperature";

        editor.deviceLibrary.commandClasses!.SetTemperature = {
          "@name": "set_temp_name",
          arguments: {
            temp: {
              "@name": "temp_arg_name",
              dataType: DataType.Number,
              required: true,
              unit: {
                name: UnitName.DegreeCelsius,
              },
            },
          },
        };
      });

      createNewCommand(
        undefined,
        "SetTemperature",
        "set-temp",
        "Set Temperature",
      );

      render(<CommandEditor id="set-temp" />);

      // Find the argument container to scope the query
      const tempArgHeading = screen.getByText("temp");
      const argContainer = tempArgHeading.parentElement!;
      const withinArg = within(argContainer);

      // Verify Unit label is properly associated with "celsius"
      expect(withinArg.getByLabelText("Unit")).toHaveTextContent("celsius");
    });

    it("should not display Unit field when argument has no unit", () => {
      createNewCommand(undefined, "SetPower", "set-power", "Set Power");

      render(<CommandEditor id="set-power" />);

      // Find the argument container to scope the query
      const stateArgHeading = screen.getByText("state");
      const argContainer = stateArgHeading.parentElement!;
      const withinArg = within(argContainer);

      // Verify Unit field is not present
      expect(withinArg.queryByText("Unit")).not.toBeInTheDocument();
      // But other fields are present
      expect(withinArg.getByLabelText("Data Type")).toBeInTheDocument();
      expect(withinArg.getByLabelText("Required")).toBeInTheDocument();
    });

    it("should display multiple arguments when command class has multiple", () => {
      // Add a command class with multiple arguments
      updateCurrentEditor((editor) => {
        editor.localizations["en-US"].strings!["multi_cmd_name"] =
          "Multi Arg Command";
        editor.localizations["en-US"].strings!["arg1_name"] = "First Argument";
        editor.localizations["en-US"].strings!["arg2_name"] = "Second Argument";

        editor.deviceLibrary.commandClasses!.MultiArgCommand = {
          "@name": "multi_cmd_name",
          arguments: {
            firstArg: {
              "@name": "arg1_name",
              dataType: DataType.String,
              required: true,
            },
            secondArg: {
              "@name": "arg2_name",
              dataType: DataType.Number,
              required: false,
            },
          },
        };
      });

      createNewCommand(
        undefined,
        "MultiArgCommand",
        "multi-cmd",
        "Multi Command",
      );

      render(<CommandEditor id="multi-cmd" />);

      // Should show both argument IDs
      expect(screen.getByText("firstArg")).toBeInTheDocument();
      expect(screen.getByText("secondArg")).toBeInTheDocument();

      // Should show both argument names
      expect(screen.getByText("First Argument")).toBeInTheDocument();
      expect(screen.getByText("Second Argument")).toBeInTheDocument();
    });
  });

  describe("EnumChoices component", () => {
    beforeEach(() => {
      // Add a command class with enum choices
      updateCurrentEditor((editor) => {
        editor.localizations["en-US"].strings!["set_mode_name"] = "Set Mode";
        editor.localizations["en-US"].strings!["mode_arg_name"] = "Mode";
        editor.localizations["en-US"].strings!["mode_auto_name"] = "Auto";
        editor.localizations["en-US"].strings!["mode_manual_name"] = "Manual";
        editor.localizations["en-US"].strings!["mode_eco_name"] = "Eco";

        editor.deviceLibrary.commandClasses!.SetMode = {
          "@name": "set_mode_name",
          arguments: {
            mode: {
              "@name": "mode_arg_name",
              dataType: DataType.String,
              required: true,
              choices: [
                { id: "auto", "@name": "mode_auto_name" },
                { id: "manual", "@name": "mode_manual_name" },
                { id: "eco", "@name": "mode_eco_name" },
              ],
            },
          },
        };
      });
    });

    it("should display View and Modify buttons when argument has choices", () => {
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Modify" }),
      ).toBeInTheDocument();
    });

    it("should display class choices in View dropdown", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // Open the View dropdown
      await user.click(screen.getByRole("button", { name: "View" }));

      // Should show "From Class" header
      expect(screen.getByText("From Class")).toBeInTheDocument();

      // Should show all class choices with their indices
      expect(screen.getByText("0: Auto")).toBeInTheDocument();
      expect(screen.getByText("1: Manual")).toBeInTheDocument();
      expect(screen.getByText("2: Eco")).toBeInTheDocument();

      // Should show "From Instance" header
      expect(screen.getByText("From Instance")).toBeInTheDocument();
    });

    it("should open Modify dialog when Modify button is clicked", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // Click the Modify button
      await user.click(screen.getByRole("button", { name: "Modify" }));

      // Dialog should be visible with title
      expect(
        screen.getByRole("heading", { name: "Enum Choices for Mode" }),
      ).toBeInTheDocument();

      // Should show a table with ID and Name column headers
      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      expect(
        withinDialog.getByRole("columnheader", { name: "ID" }),
      ).toBeInTheDocument();
      expect(
        withinDialog.getByRole("columnheader", { name: "Name" }),
      ).toBeInTheDocument();
    });

    it("should display class choices in Modify dialog table", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      await user.click(screen.getByRole("button", { name: "Modify" }));

      // Find the table in the dialog
      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      // Should show all class choices
      expect(withinTable.getByText("auto")).toBeInTheDocument();
      expect(withinTable.getByText("Auto")).toBeInTheDocument();
      expect(withinTable.getByText("manual")).toBeInTheDocument();
      expect(withinTable.getByText("Manual")).toBeInTheDocument();
      expect(withinTable.getByText("eco")).toBeInTheDocument();
      expect(withinTable.getByText("Eco")).toBeInTheDocument();

      // Should have checkboxes for excluding choices (3 for class choices)
      const checkboxes = withinTable.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3);
    });
  });
});

describe("EnumChoices - advanced functionality", () => {
  beforeEach(() => {
    createDeviceClassEditor();

    // Set up command class with enum choices
    updateCurrentEditor((editor) => {
      editor.localizations["en-US"] ||= { strings: {} };
      const strings = editor.localizations["en-US"].strings!;

      strings["set_mode_name"] = "Set Mode";
      strings["mode_arg_name"] = "Mode";
      strings["mode_auto_name"] = "Auto";
      strings["mode_manual_name"] = "Manual";
      strings["mode_eco_name"] = "Eco";

      editor.deviceLibrary.commandClasses = {
        SetMode: {
          "@name": "set_mode_name",
          arguments: {
            mode: {
              "@name": "mode_arg_name",
              dataType: DataType.String,
              required: true,
              choices: [
                { id: "auto", "@name": "mode_auto_name" },
                { id: "manual", "@name": "mode_manual_name" },
                { id: "eco", "@name": "mode_eco_name" },
              ],
            },
          },
        },
      };
    });
  });

  describe("modifying class choices", () => {
    it("should allow excluding class choices from the instance", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // Open Modify dialog
      await user.click(screen.getByRole("button", { name: "Modify" }));

      // Find the table in the dialog
      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const checkboxes = withinTable.getAllByRole("checkbox");
      expect(checkboxes[0]).toBeChecked();

      // Exclude the first choice (auto)
      await user.click(checkboxes[0]);

      // Verify the checkbox is now unchecked (excluded)
      expect(checkboxes[0]).not.toBeChecked();
    });

    it("should show excluded choices as strikethrough in the View dropdown", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // First, exclude a choice via the Modify dialog
      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const checkboxes = withinTable.getAllByRole("checkbox");
      await user.click(checkboxes[0]); // Exclude "auto"

      // Close dialog (press Escape)
      await user.keyboard("{Escape}");

      // Open View dropdown
      await user.click(screen.getByRole("button", { name: "View" }));

      // Find the excluded choice - it should have line-through styling
      const autoChoice = screen.getByText("0: Auto");
      expect(autoChoice).toHaveClass("line-through");
    });
  });

  describe("managing instance choices", () => {
    it("should allow adding new instance choices", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // Open Modify dialog
      await user.click(screen.getByRole("button", { name: "Modify" }));

      // Find the table in the dialog
      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      // Click the add button (plus icon) in the table footer
      const buttons = withinTable.getAllByRole("button");
      const addButton = buttons[buttons.length - 1]; // Last button is the add button in footer
      await user.click(addButton);

      // Should now have a row with inputs for the new choice
      const inputs = withinTable.getAllByRole("textbox");
      expect(inputs.length).toBeGreaterThanOrEqual(2);

      // Verify default values
      expect(inputs[0]).toHaveValue("new-choice");
      expect(inputs[1]).toHaveValue("New Choice");
    });

    it("should allow editing instance choice ID and name", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // Open Modify dialog
      await user.click(screen.getByRole("button", { name: "Modify" }));

      // Find the table in the dialog
      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      // Add a new instance choice first
      const buttons = withinTable.getAllByRole("button");
      const addButton = buttons[buttons.length - 1];
      await user.click(addButton);

      // Get the input fields
      const inputs = withinTable.getAllByRole("textbox");
      const idInput = inputs[0];
      const nameInput = inputs[1];

      // Edit the ID
      await user.clear(idInput);
      await user.type(idInput, "custom-mode");
      await user.keyboard("{Enter}");

      // Edit the name
      await user.clear(nameInput);
      await user.type(nameInput, "Custom Mode");
      await user.keyboard("{Enter}");

      // Verify the values were updated
      expect(idInput).toHaveValue("custom-mode");
      expect(nameInput).toHaveValue("Custom Mode");
    });

    it("should allow removing instance choices", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // Open Modify dialog
      await user.click(screen.getByRole("button", { name: "Modify" }));

      // Find the table in the dialog
      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      // Add a new instance choice
      const buttons = withinTable.getAllByRole("button");
      const addButton = buttons[buttons.length - 1];
      await user.click(addButton);

      // Verify the choice was added
      let inputs = withinTable.getAllByRole("textbox");
      expect(inputs).toHaveLength(2);

      // Get all buttons - there should be 2: trash button (in row) and add button (in footer)
      const tableButtons = withinTable.getAllByRole("button");
      expect(tableButtons).toHaveLength(2);

      // The first button should be the trash button (in the table row)
      const trashButton = tableButtons[0];
      await user.click(trashButton);

      // Verify the choice was removed
      inputs = withinTable.queryAllByRole("textbox");
      expect(inputs).toHaveLength(0);
    });

    it("should validate instance choice IDs for uniqueness", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // Open Modify dialog
      await user.click(screen.getByRole("button", { name: "Modify" }));

      // Find the table in the dialog
      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      // Add two instance choices
      const buttons = withinTable.getAllByRole("button");
      const addButton = buttons[buttons.length - 1];
      await user.click(addButton);
      await user.click(addButton);

      // Get the input fields
      const inputs = withinTable.getAllByRole("textbox");
      const secondIdInput = inputs[2];

      // Try to set the second choice to have the same ID as the first
      await user.clear(secondIdInput);
      await user.type(secondIdInput, "new-choice");

      // Should show validation error
      expect(
        await screen.findByText("ID must be unique", {}, { timeout: 3000 }),
      ).toBeInTheDocument();
    });

    it("should show instance choices in View dropdown", async () => {
      const user = userEvent.setup();
      createNewCommand(undefined, "SetMode", "set-mode", "Set Mode");

      render(<CommandEditor id="set-mode" />);

      // Add an instance choice
      await user.click(screen.getByRole("button", { name: "Modify" }));

      // Find the table in the dialog
      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      // Click the add button
      const buttons = withinTable.getAllByRole("button");
      const addButton = buttons[buttons.length - 1];
      await user.click(addButton);

      // Edit the new choice
      const inputs = withinTable.getAllByRole("textbox");
      await user.clear(inputs[0]);
      await user.type(inputs[0], "turbo");
      await user.keyboard("{Enter}");
      await user.clear(inputs[1]);
      await user.type(inputs[1], "Turbo");
      await user.keyboard("{Enter}");

      // Close dialog
      await user.keyboard("{Escape}");

      // Open View dropdown
      await user.click(screen.getByRole("button", { name: "View" }));

      // Should show the instance choice with correct index (3 class choices + this one)
      expect(screen.getByText("3: Turbo")).toBeInTheDocument();
    });
  });
});

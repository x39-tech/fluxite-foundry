import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";
import { CommandEditor } from "./CommandEditor";
import { createDeviceClassEditor } from "features/topNavBar/state";
import { createNewCommand } from "./state";
import { updateCurrentEditor } from "../state";
import {
  CodexId,
  EntityId,
  LocalizationKey,
  LocalizationDbSchema,
} from "app/persistentState";
import { newEntityId } from "app/stateUtils";

const TEST_LOCALE = "en-US";

// Helper to create a localization entry with proper types
function addLocalization(
  editor: Parameters<Parameters<typeof updateCurrentEditor>[0]>[0],
  key: string,
  value: string,
) {
  const locKey = LocalizationKey(key);
  editor.localizations[locKey] = {
    strings: LocalizationDbSchema.parse({ [TEST_LOCALE]: value }),
    items: [],
  };
  return locKey;
}

beforeEach(() => {
  createDeviceClassEditor();

  // Add test command classes to the device class editor with proper localizations
  updateCurrentEditor((editor) => {
    // Add localization strings
    const setPowerNameKey = addLocalization(
      editor,
      "set_power_name",
      "Set Power",
    );
    const setPowerDescKey = addLocalization(
      editor,
      "set_power_desc",
      "Sets the power state",
    );
    const setPowerStateNameKey = addLocalization(
      editor,
      "set_power_state_name",
      "State",
    );
    const setPowerStateDescKey = addLocalization(
      editor,
      "set_power_state_desc",
      "Power state",
    );
    const getStatusNameKey = addLocalization(
      editor,
      "get_status_name",
      "Get Status",
    );
    const getStatusDescKey = addLocalization(
      editor,
      "get_status_desc",
      "Gets the current status",
    );
    const getStatusReturnNameKey = addLocalization(
      editor,
      "get_status_return_name",
      "Status",
    );
    const getStatusReturnDescKey = addLocalization(
      editor,
      "get_status_return_desc",
      "Current status",
    );

    // Add command classes
    const setPowerId = newEntityId();
    const getStatusId = newEntityId();
    const setPowerArgId = newEntityId();
    const getStatusRetId = newEntityId();

    editor.commandClasses[setPowerId] = {
      codexId: CodexId("SetPower"),
      localized: {
        name: setPowerNameKey,
        description: setPowerDescKey,
      },
    };

    editor.commandClasses[getStatusId] = {
      codexId: CodexId("GetStatus"),
      localized: {
        name: getStatusNameKey,
        description: getStatusDescKey,
      },
    };

    // Add command class arguments
    editor.commandClassArguments[setPowerArgId] = {
      parentId: setPowerId,
      codexId: CodexId("state"),
      dataType: "boolean",
      required: true,
      localized: {
        name: setPowerStateNameKey,
        description: setPowerStateDescKey,
      },
    };

    // Add command class return values
    editor.commandClassReturnValues[getStatusRetId] = {
      parentId: getStatusId,
      codexId: CodexId("status"),
      dataType: "string",
      required: true,
      localized: {
        name: getStatusReturnNameKey,
        description: getStatusReturnDescKey,
      },
    };
  });
});

describe("CommandEditor", () => {
  describe("basic rendering", () => {
    it("should render error when command does not exist", () => {
      render(<CommandEditor id={EntityId("non-existent-command")} />);
      expect(screen.getByText("Something has gone wrong!")).toBeInTheDocument();
    });

    it("should display command metadata fields", () => {
      // Create a command with a class from the device library
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("set-power"),
        "Set Power",
        TEST_LOCALE,
      );

      // Get the created command's EntityId
      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-power",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

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
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("set-power"),
        "Set Power",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-power",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

      const libraryInput = screen.getByLabelText("Library");
      expect(libraryInput).toHaveValue("Device Library");
      expect(libraryInput).toBeDisabled();
    });

    it("should display the command ID and display name", () => {
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("set-power"),
        "Set Power",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-power",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

      expect(screen.getByLabelText("ID")).toHaveValue("set-power");
      expect(screen.getByLabelText("Display Name")).toHaveValue("Set Power");
    });
  });

  describe("completion notification", () => {
    it("should allow toggling completion notification for commands without return values", async () => {
      const user = userEvent.setup();
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("set-power"),
        "Set Power",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-power",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

      const checkbox = screen.getByRole("checkbox", {
        name: "Supports Completion Notification",
      });
      expect(checkbox).not.toBeDisabled();
      expect(checkbox).not.toBeChecked();

      await user.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  describe("editing command metadata", () => {
    it("should allow changing the command ID", async () => {
      const user = userEvent.setup();
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("set-power"),
        "Set Power",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-power",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

      const idInput = screen.getByLabelText("ID");
      await user.click(idInput);
      await user.clear(idInput);
      await user.type(idInput, "new-power-command");
      await user.keyboard("{Enter}");

      // Verify the ID was updated
      expect(screen.getByLabelText("ID")).toHaveValue("new-power-command");
    });

    it("should allow changing the display name", async () => {
      const user = userEvent.setup();
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("set-power"),
        "Set Power",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-power",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

      const nameInput = screen.getByLabelText("Display Name");
      await user.click(nameInput);
      await user.clear(nameInput);
      await user.type(nameInput, "Turn On Power");
      await user.keyboard("{Enter}");

      expect(screen.getByLabelText("Display Name")).toHaveValue(
        "Turn On Power",
      );
    });

    it("should validate command ID to prevent duplicates", async () => {
      const user = userEvent.setup();
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("command-1"),
        "Command 1",
        TEST_LOCALE,
      );
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("command-2"),
        "Command 2",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "command-1",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

      const idInput = screen.getByLabelText("ID");
      await user.click(idInput);
      await user.clear(idInput);
      await user.type(idInput, "command-2");

      expect(
        await screen.findByText("ID must be unique", {}, { timeout: 3000 }),
      ).toBeInTheDocument();
    });
  });

  describe("arguments display", () => {
    it("should display Arguments section", () => {
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("set-power"),
        "Set Power",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-power",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

      expect(screen.getByText("Arguments")).toBeInTheDocument();
    });

    it("should display argument details from command class", () => {
      createNewCommand(
        undefined,
        CodexId("SetPower"),
        CodexId("set-power"),
        "Set Power",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-power",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

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

    it("should display enum choices editor when argument has choices", () => {
      // Add a command class with an enum argument
      updateCurrentEditor((editor) => {
        const setModeNameKey = addLocalization(
          editor,
          "set_mode_name",
          "Set Mode",
        );
        const modeArgNameKey = addLocalization(editor, "mode_arg_name", "Mode");

        const setModeId = newEntityId();
        const modeArgId = newEntityId();
        const autoChoiceId = newEntityId();
        const manualChoiceId = newEntityId();

        editor.commandClasses[setModeId] = {
          codexId: CodexId("SetMode"),
          localized: {
            name: setModeNameKey,
          },
        };

        editor.commandClassArguments[modeArgId] = {
          parentId: setModeId,
          codexId: CodexId("mode"),
          dataType: "string",
          required: true,
          localized: {
            name: modeArgNameKey,
          },
        };

        // Add enum choices for the argument
        const autoNameKey = addLocalization(editor, "auto_name", "Auto");
        const manualNameKey = addLocalization(editor, "manual_name", "Manual");

        editor.enumChoices[autoChoiceId] = {
          codexId: CodexId("auto"),
          index: 0,
          parent: {
            type: "cmdClassArg",
            id: modeArgId,
          },
          localized: {
            name: autoNameKey,
          },
        };

        editor.enumChoices[manualChoiceId] = {
          codexId: CodexId("manual"),
          index: 1,
          parent: {
            type: "cmdClassArg",
            id: modeArgId,
          },
          localized: {
            name: manualNameKey,
          },
        };
      });

      createNewCommand(
        undefined,
        CodexId("SetMode"),
        CodexId("set-mode"),
        "Set Mode",
        TEST_LOCALE,
      );

      let commandId: EntityId | undefined;
      updateCurrentEditor((editor) => {
        const cmd = Object.entries(editor.commands).find(
          ([_, c]) => c.codexId === "set-mode",
        );
        if (cmd) commandId = EntityId(cmd[0]);
      });

      if (!commandId) throw new Error("Command not created");

      render(<CommandEditor id={commandId} />);

      // EnumChoicesEditor should be rendered with View and Modify buttons
      expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: "Modify" }),
      ).toBeInTheDocument();
    });
  });
});

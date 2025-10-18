import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { EnumChoicesEditor } from "./EnumChoicesEditor";
import {
  addEnumChoice,
  deleteEnumChoice,
  modifyEnumChoice,
  modifyEnumChoiceLocalizedValue,
} from "features/deviceClassEditor/state";
import { CodexId, EntityId, EnumChoiceParent } from "app/persistentState";
import type {
  LocalizedClassEnumChoice,
  LocalizedInstanceEnumChoice,
} from "features/deviceClassEditor/stateTransformations";

vi.mock("features/deviceClassEditor/state", () => ({
  addEnumChoice: vi.fn(),
  deleteEnumChoice: vi.fn(),
  modifyEnumChoice: vi.fn(),
  modifyEnumChoiceLocalizedValue: vi.fn(),
}));

const mockAddEnumChoice = vi.mocked(addEnumChoice);
const mockDeleteEnumChoice = vi.mocked(deleteEnumChoice);
const mockModifyEnumChoice = vi.mocked(modifyEnumChoice);
const mockModifyEnumChoiceLocalizedValue = vi.mocked(
  modifyEnumChoiceLocalizedValue,
);

describe("EnumChoicesEditor", () => {
  const parent: EnumChoiceParent = {
    type: "cmdArg",
    id: CodexId("state"),
    idType: "imported",
    cmdId: EntityId("cmd-123"),
  };

  const classChoices: LocalizedClassEnumChoice[] = [
    {
      codexId: CodexId("auto"),
      name: { desiredLocale: "en-US", value: "Auto" },
      description: { desiredLocale: "en-US", value: "Auto mode" },
    },
    {
      codexId: CodexId("manual"),
      name: { desiredLocale: "en-US", value: "Manual" },
      description: { desiredLocale: "en-US", value: "Manual mode" },
    },
    {
      codexId: CodexId("eco"),
      name: { desiredLocale: "en-US", value: "Eco" },
    },
  ];

  const instanceChoices: LocalizedInstanceEnumChoice[] = [
    {
      id: EntityId("choice-1"),
      codexId: CodexId("turbo"),
      index: 0,
      name: { desiredLocale: "en-US", value: "Turbo" },
      description: { desiredLocale: "en-US", value: "Turbo mode" },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("View dropdown", () => {
    it("should render View button", () => {
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      expect(screen.getByRole("button", { name: "View" })).toBeInTheDocument();
    });

    it("should display class choices in View dropdown with indices", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "View" }));

      expect(screen.getByText("From Class")).toBeInTheDocument();
      expect(screen.getByText("0: Auto")).toBeInTheDocument();
      expect(screen.getByText("1: Manual")).toBeInTheDocument();
      expect(screen.getByText("2: Eco")).toBeInTheDocument();
    });

    it("should display From Instance header in View dropdown", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "View" }));

      expect(screen.getByText("From Instance")).toBeInTheDocument();
    });

    it("should display instance choices in View dropdown", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          instanceChoices={instanceChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "View" }));

      // Instance choice index starts after class choices (3)
      expect(screen.getByText("3: Turbo")).toBeInTheDocument();
    });

    it("should show excluded class choices as strikethrough", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          exclusions={[CodexId("auto")]}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "View" }));

      const autoChoice = screen.getByText("0: Auto");
      expect(autoChoice).toHaveClass("line-through");

      const manualChoice = screen.getByText("1: Manual");
      expect(manualChoice).not.toHaveClass("line-through");
    });
  });

  describe("Modify dialog", () => {
    it("should render Modify button", () => {
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Modify" }),
      ).toBeInTheDocument();
    });

    it("should open dialog when Modify button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      expect(
        screen.getByRole("heading", { name: "Enum Choices for Mode" }),
      ).toBeInTheDocument();
    });

    it("should display table headers in dialog", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      expect(
        withinDialog.getByRole("columnheader", { name: "ID" }),
      ).toBeInTheDocument();
      expect(
        withinDialog.getByRole("columnheader", { name: "Name" }),
      ).toBeInTheDocument();
    });

    it("should display class choices in table", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);

      expect(withinDialog.getByText("auto")).toBeInTheDocument();
      expect(withinDialog.getByText("Auto")).toBeInTheDocument();
      expect(withinDialog.getByText("manual")).toBeInTheDocument();
      expect(withinDialog.getByText("Manual")).toBeInTheDocument();
      expect(withinDialog.getByText("eco")).toBeInTheDocument();
      expect(withinDialog.getByText("Eco")).toBeInTheDocument();
    });

    it("should have checkboxes for class choices", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const checkboxes = withinTable.getAllByRole("checkbox");
      expect(checkboxes).toHaveLength(3); // One for each class choice
    });

    it("should show class choices as checked by default", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const checkboxes = withinTable.getAllByRole("checkbox");
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });

    it("should show excluded class choices as unchecked", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          exclusions={[CodexId("auto")]}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const checkboxes = withinTable.getAllByRole("checkbox");
      expect(checkboxes[0]).not.toBeChecked(); // auto is excluded
      expect(checkboxes[1]).toBeChecked(); // manual is not excluded
      expect(checkboxes[2]).toBeChecked(); // eco is not excluded
    });
  });

  describe("modifying class choices", () => {
    it("should call onExclusionChanged when checkbox is toggled", async () => {
      const user = userEvent.setup();
      const onExclusionChanged = vi.fn();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={onExclusionChanged}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const checkboxes = withinTable.getAllByRole("checkbox");
      await user.click(checkboxes[0]); // Uncheck first choice (auto)

      expect(onExclusionChanged).toHaveBeenCalledWith("auto", true);
    });

    it("should call onExclusionChanged with false when re-enabling excluded choice", async () => {
      const user = userEvent.setup();
      const onExclusionChanged = vi.fn();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          exclusions={[CodexId("auto")]}
          onExclusionChanged={onExclusionChanged}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const checkboxes = withinTable.getAllByRole("checkbox");
      await user.click(checkboxes[0]); // Re-check first choice (auto)

      expect(onExclusionChanged).toHaveBeenCalledWith("auto", false);
    });

    it("should show excluded choices with muted styling in table", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          exclusions={[CodexId("manual")]}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const rows = withinTable.getAllByRole("row");
      // Skip header row (index 0)
      expect(rows[1]).not.toHaveClass("text-muted-foreground"); // auto
      expect(rows[2]).toHaveClass("text-muted-foreground"); // manual (excluded)
      expect(rows[3]).not.toHaveClass("text-muted-foreground"); // eco
    });
  });

  describe("managing instance choices", () => {
    it("should display instance choices in table as editable", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          instanceChoices={instanceChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const inputs = withinTable.getAllByRole("textbox");
      expect(inputs).toHaveLength(2); // ID and Name for one instance choice
      expect(inputs[0]).toHaveValue("turbo");
      expect(inputs[1]).toHaveValue("Turbo");
    });

    it("should have add button in table footer", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const buttons = withinTable.getAllByRole("button");
      // Last button should be the add button
      expect(buttons[buttons.length - 1]).toBeInTheDocument();
    });

    it("should call addEnumChoice when add button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const buttons = withinTable.getAllByRole("button");
      await user.click(buttons[buttons.length - 1]); // Click add button

      expect(mockAddEnumChoice).toHaveBeenCalledWith(
        parent,
        expect.any(String), // ID will be generated
        "New Choice",
        undefined,
        "en-US",
      );
    });

    it("should have delete button for each instance choice", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          instanceChoices={instanceChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      // Should have delete button (trash icon) for the instance choice
      const buttons = withinTable.getAllByRole("button");
      // First button is delete, last is add
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });

    it("should call deleteEnumChoice when delete button is clicked", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          instanceChoices={instanceChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const buttons = withinTable.getAllByRole("button");
      await user.click(buttons[0]); // Click first button (delete)

      expect(mockDeleteEnumChoice).toHaveBeenCalledWith(EntityId("choice-1"));
    });

    it("should call modifyEnumChoice when ID is edited", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          instanceChoices={instanceChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const inputs = withinTable.getAllByRole("textbox");
      const idInput = inputs[0];

      await user.clear(idInput);
      await user.type(idInput, "super-turbo");
      await user.keyboard("{Enter}");

      expect(mockModifyEnumChoice).toHaveBeenCalledWith(
        EntityId("choice-1"),
        expect.any(Function),
      );
    });

    it("should call modifyEnumChoiceLocalizedValue when name is edited", async () => {
      const user = userEvent.setup();
      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          instanceChoices={instanceChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const inputs = withinTable.getAllByRole("textbox");
      const nameInput = inputs[1];

      await user.clear(nameInput);
      await user.type(nameInput, "Super Turbo");
      await user.keyboard("{Enter}");

      expect(mockModifyEnumChoiceLocalizedValue).toHaveBeenCalledWith(
        EntityId("choice-1"),
        "name",
        "Super Turbo",
        "en-US",
      );
    });
  });

  describe("validation", () => {
    it("should validate that instance choice IDs are unique", async () => {
      const user = userEvent.setup();
      const multipleInstanceChoices: LocalizedInstanceEnumChoice[] = [
        {
          id: EntityId("choice-1"),
          codexId: CodexId("turbo"),
          index: 0,
          name: { desiredLocale: "en-US", value: "Turbo" },
        },
        {
          id: EntityId("choice-2"),
          codexId: CodexId("sport"),
          index: 1,
          name: { desiredLocale: "en-US", value: "Sport" },
        },
      ];

      render(
        <EnumChoicesEditor
          forName="Mode"
          parent={parent}
          classChoices={classChoices}
          instanceChoices={multipleInstanceChoices}
          onExclusionChanged={() => {}}
        />,
      );

      await user.click(screen.getByRole("button", { name: "Modify" }));

      const dialog = screen.getByRole("dialog");
      const withinDialog = within(dialog);
      const table = withinDialog.getByRole("table");
      const withinTable = within(table);

      const inputs = withinTable.getAllByRole("textbox");
      const secondIdInput = inputs[2]; // Second instance choice ID

      // Try to set it to same ID as first choice
      await user.clear(secondIdInput);
      await user.type(secondIdInput, "turbo");

      // Validation error should appear
      expect(
        await screen.findByText("ID must be unique", {}, { timeout: 3000 }),
      ).toBeInTheDocument();
    });
  });
});

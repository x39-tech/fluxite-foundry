import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MappingRangeEditorDialog } from "./MappingRangeEditorDialog";
import { CodexId, DmxMappingRange } from "app/persistentState";
import { EffectiveEnumChoice } from "./mappingUtils";
import { MappableDataType } from "./state";

describe("MappingRangeEditorDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
  });

  const renderDialog = (
    range: DmxMappingRange,
    dataType: MappableDataType = "number",
    enumChoices?: EffectiveEnumChoice[],
  ) => {
    return render(
      <MappingRangeEditorDialog
        isOpen={true}
        onClose={mockOnClose}
        range={range}
        onSave={mockOnSave}
        dataType={dataType}
        enumChoices={enumChoices}
      />,
    );
  };

  // Helper to create test enum choices
  const createEnumChoices = (names: string[]): EffectiveEnumChoice[] => {
    return names.map((name, index) => ({
      index,
      codexId: CodexId(`choice-${index}`),
      name: { value: name, locale: "en", desiredLocale: "en" },
    }));
  };

  describe("initial values", () => {
    it("opens with correct initial values for range mode", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 10, chunkEnd: 200 },
      };

      renderDialog(range);

      expect(screen.getByText("Edit Mapping Range")).toBeInTheDocument();
      expect(screen.getByDisplayValue("0")).toBeInTheDocument();
      expect(screen.getByDisplayValue("100")).toBeInTheDocument();
      expect(screen.getByDisplayValue("10")).toBeInTheDocument();
      expect(screen.getByDisplayValue("200")).toBeInTheDocument();
    });

    it("opens with correct initial values for sequence mode", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 50,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
            { chunkStart: 100, chunkEnd: 255, hold: { milliseconds: 1000 } },
          ],
        },
      };

      renderDialog(range);

      expect(screen.getByText("Sequence Steps")).toBeInTheDocument();
      expect(screen.getByText("Total: 1.5s")).toBeInTheDocument();
    });
  });

  describe("mode indicator", () => {
    it("shows Range in mode selector for range mode", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      expect(screen.getByText("DMX Output Range")).toBeInTheDocument();
      // The mode selector shows "Range" - it's the first combobox after the numeric inputs
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes[0]).toHaveTextContent("Range");
    });

    it("shows Sequence in mode selector for sequence mode", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
          ],
        },
      };

      renderDialog(range);

      expect(screen.getByText("Sequence Steps")).toBeInTheDocument();
      // The mode selector is the first combobox
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes[0]).toHaveTextContent("Sequence");
    });
  });

  describe("save button validation", () => {
    it("save button is enabled for valid range mode", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });

    it("save button is disabled when sequence has zero steps", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: { type: "sequence", steps: [] },
      };

      renderDialog(range);

      expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
    });

    it("save button is enabled for sequence with at least one step", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
          ],
        },
      };

      renderDialog(range);

      expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    });
  });

  describe("cancel and save actions", () => {
    it("cancel button closes the dialog without saving", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      await user.click(screen.getByRole("button", { name: "Cancel" }));

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    it("save button saves the range and closes the dialog", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 10, chunkEnd: 200 },
      };

      renderDialog(range);

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockOnSave).toHaveBeenCalledTimes(1);
      expect(mockOnSave).toHaveBeenCalledWith({
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 10, chunkEnd: 200 },
      });
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it("saves updated DMX chunk values after editing", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      // Find the DMX Start input (labeled "Start:" in the DMX Output Range section)
      // All inputs are now textboxes (parameter bounds use type="text", DMX uses IntegerInput)
      const allInputs = screen.getAllByRole("textbox");
      // The chunk start/end inputs are the 3rd and 4th inputs (after param start/end)
      const chunkStartInput = allInputs[2];
      await user.clear(chunkStartInput);
      await user.type(chunkStartInput, "50");

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockOnSave).toHaveBeenCalledWith({
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 50, chunkEnd: 255 },
      });
    });

    it("saves sequence mode data correctly", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 128, hold: { milliseconds: 500 } },
            { chunkStart: 128, chunkEnd: 255, hold: { milliseconds: 1000 } },
          ],
        },
      };

      renderDialog(range);

      // The first two textboxes are parameter bounds (start/end)
      // After that, each sequence step has DMX start, DMX end, and hold duration inputs
      const allInputs = screen.getAllByRole("textbox");
      // allInputs[0] = param start, allInputs[1] = param end
      // allInputs[2] = step 1 DMX start, allInputs[3] = step 1 DMX end, allInputs[4] = step 1 hold ms
      // allInputs[5] = step 2 DMX start, allInputs[6] = step 2 DMX end, allInputs[7] = step 2 hold ms

      // Helper to set input value in controlled inputs
      // Uses fireEvent.change for reliable value replacement
      const setInputValue = (input: HTMLElement, value: string) => {
        fireEvent.change(input, { target: { value } });
      };

      // Modify the first step's DMX start value
      setInputValue(allInputs[2], "10");

      // Modify the first step's hold duration
      setInputValue(allInputs[4], "750");

      // Modify the second step's DMX end value
      setInputValue(allInputs[6], "200");

      // Change the second step's hold type to indefinite (it's the last step)
      const holdTypeSelectors = screen.getAllByRole("combobox");
      // holdTypeSelectors[0] = output mode selector, holdTypeSelectors[1] = step 1 hold type, holdTypeSelectors[2] = step 2 hold type
      await user.click(holdTypeSelectors[2]);
      await user.click(screen.getByRole("option", { name: "Indefinite" }));

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockOnSave).toHaveBeenCalledWith({
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 10, chunkEnd: 128, hold: { milliseconds: 750 } },
            { chunkStart: 128, chunkEnd: 200, hold: "indefinite" },
          ],
        },
      });
    });
  });

  describe("dialog does not open when isOpen is false", () => {
    it("does not render dialog content when closed", () => {
      render(
        <MappingRangeEditorDialog
          isOpen={false}
          onClose={mockOnClose}
          range={{
            start: 0,
            end: 100,
            chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
          }}
          onSave={mockOnSave}
          dataType="number"
        />,
      );

      expect(screen.queryByText("Edit Mapping Range")).not.toBeInTheDocument();
    });
  });

  describe("parameter bound input features", () => {
    it("supports floating point numbers in parameter bounds", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 1,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      // Get the parameter start input (first textbox)
      const allInputs = screen.getAllByRole("textbox");
      const startInput = allInputs[0];
      await user.clear(startInput);
      await user.type(startInput, "0.5");

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockOnSave).toHaveBeenCalledWith({
        start: 0.5,
        end: 1,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      });
    });

    it("supports negative floating point numbers", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 1,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      const allInputs = screen.getAllByRole("textbox");
      const startInput = allInputs[0];
      await user.clear(startInput);
      await user.type(startInput, "-10.5");

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockOnSave).toHaveBeenCalledWith({
        start: -10.5,
        end: 1,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      });
    });

    it("allows clearing parameter bound to undefined", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 100,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      const allInputs = screen.getAllByRole("textbox");
      const endInput = allInputs[1];
      await user.clear(endInput);

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockOnSave).toHaveBeenCalledWith({
        start: 0,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      });
    });

    it("displays placeholder for null values", () => {
      const range: DmxMappingRange = {
        start: undefined,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      const allInputs = screen.getAllByRole("textbox");
      // Parameter bounds should have placeholder "null"
      expect(allInputs[0]).toHaveAttribute("placeholder", "null");
      expect(allInputs[1]).toHaveAttribute("placeholder", "null");
    });

    it("displays start value in end field when end is undefined", () => {
      const range: DmxMappingRange = {
        start: 50,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      const allInputs = screen.getAllByRole("textbox");
      // Both inputs should show the same value
      expect(allInputs[0]).toHaveValue("50");
      expect(allInputs[1]).toHaveValue("50");
    });

    it("sets end to undefined when user enters same value as start", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 10,
        end: 100,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range);

      // Change end to match start using fireEvent for reliable value replacement
      const allInputs = screen.getAllByRole("textbox");
      fireEvent.change(allInputs[1], { target: { value: "10" } });

      await user.click(screen.getByRole("button", { name: "Save" }));

      // End should be undefined since it matches start
      expect(mockOnSave).toHaveBeenCalledWith({
        start: 10,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      });
    });
  });

  describe("boolean parameter handling", () => {
    it("displays boolean inputs when dataType is boolean", () => {
      const range: DmxMappingRange = {
        start: false,
        end: true,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range, "boolean");

      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes[0]).toHaveTextContent("false");
      expect(comboboxes[1]).toHaveTextContent("true");
    });

    it("displays start value in end field when end is undefined", () => {
      const range: DmxMappingRange = {
        start: true,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range, "boolean");

      const comboboxes = screen.getAllByRole("combobox");
      // Both dropdowns should show "true"
      expect(comboboxes[0]).toHaveTextContent("true");
      expect(comboboxes[1]).toHaveTextContent("true");
    });

    it("sets end to undefined when user selects same value as start", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: false,
        end: true,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range, "boolean");

      // Change end to match start (false)
      const comboboxes = screen.getAllByRole("combobox");
      await user.click(comboboxes[1]); // End value dropdown
      await user.click(screen.getByRole("option", { name: "false" }));

      await user.click(screen.getByRole("button", { name: "Save" }));

      // End should be undefined since it matches start
      expect(mockOnSave).toHaveBeenCalledWith({
        start: false,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      });
    });
  });

  describe("enum parameter handling", () => {
    it("displays enum select inputs with valid choices", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 2,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };
      const choices = createEnumChoices(["Square", "Sine", "Sawtooth"]);

      renderDialog(range, "enum", choices);

      // Enum mode uses Select dropdowns
      const comboboxes = screen.getAllByRole("combobox");
      // First two are for Start/End enum values
      expect(comboboxes[0]).toHaveTextContent("Square (0)");
      expect(comboboxes[1]).toHaveTextContent("Sawtooth (2)");
    });

    it("shows invalid placeholder when enum value does not match any choice", () => {
      const range: DmxMappingRange = {
        start: 5, // Invalid - no choice with index 5
        end: 1,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };
      const choices = createEnumChoices(["Square", "Sine", "Sawtooth"]);

      renderDialog(range, "enum", choices);

      const comboboxes = screen.getAllByRole("combobox");
      // First combobox should show invalid placeholder
      expect(comboboxes[0]).toHaveTextContent("Invalid: 5");
      // Second combobox has valid value
      expect(comboboxes[1]).toHaveTextContent("Sine (1)");
    });

    it("applies warning styling to invalid enum values", () => {
      const range: DmxMappingRange = {
        start: 99, // Invalid
        end: 0,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };
      const choices = createEnumChoices(["Open", "Closed"]);

      renderDialog(range, "enum", choices);

      // Find select triggers and check for orange border class
      const triggers = document.querySelectorAll('[class*="border-orange"]');
      expect(triggers.length).toBeGreaterThan(0);
    });

    it("shows invalid placeholder when enum has no choices", () => {
      const range: DmxMappingRange = {
        start: 0,
        end: 1,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      // Render with enum type but empty choices
      renderDialog(range, "enum", []);

      // Should still show enum selects with invalid placeholders
      const comboboxes = screen.getAllByRole("combobox");
      // First two comboboxes are for Start/End values, both invalid since no choices
      expect(comboboxes[0]).toHaveTextContent("Invalid: 0");
      expect(comboboxes[1]).toHaveTextContent("Invalid: 1");
    });

    it("saves enum values correctly", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 1,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };
      const choices = createEnumChoices(["Square", "Sine", "Sawtooth"]);

      renderDialog(range, "enum", choices);

      // Change the end value to Sawtooth (index 2)
      const comboboxes = screen.getAllByRole("combobox");
      await user.click(comboboxes[1]); // End value dropdown
      await user.click(screen.getByRole("option", { name: "Sawtooth (2)" }));

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockOnSave).toHaveBeenCalledWith({
        start: 0,
        end: 2,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      });
    });

    it("allows selecting null for enum values", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 1,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };
      const choices = createEnumChoices(["Square", "Sine"]);

      renderDialog(range, "enum", choices);

      // Change the end value to null
      const comboboxes = screen.getAllByRole("combobox");
      await user.click(comboboxes[1]); // End value dropdown
      await user.click(screen.getByRole("option", { name: "null" }));

      await user.click(screen.getByRole("button", { name: "Save" }));

      expect(mockOnSave).toHaveBeenCalledWith({
        start: 0,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      });
    });

    it("displays start value in end field when end is undefined", () => {
      const range: DmxMappingRange = {
        start: 1,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };
      const choices = createEnumChoices(["Square", "Sine", "Sawtooth"]);

      renderDialog(range, "enum", choices);

      // Both dropdowns should show the same value (Sine)
      const comboboxes = screen.getAllByRole("combobox");
      expect(comboboxes[0]).toHaveTextContent("Sine (1)");
      expect(comboboxes[1]).toHaveTextContent("Sine (1)");
    });

    it("sets end to undefined when user selects same value as start", async () => {
      const user = userEvent.setup();
      const range: DmxMappingRange = {
        start: 0,
        end: 2,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };
      const choices = createEnumChoices(["Square", "Sine", "Sawtooth"]);

      renderDialog(range, "enum", choices);

      // Change end to match start (Square)
      const comboboxes = screen.getAllByRole("combobox");
      await user.click(comboboxes[1]); // End value dropdown
      await user.click(screen.getByRole("option", { name: "Square (0)" }));

      await user.click(screen.getByRole("button", { name: "Save" }));

      // End should be undefined since it matches start
      expect(mockOnSave).toHaveBeenCalledWith({
        start: 0,
        end: undefined,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      });
    });
  });
});

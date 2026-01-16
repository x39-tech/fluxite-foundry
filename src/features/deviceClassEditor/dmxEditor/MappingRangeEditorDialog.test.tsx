import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MappingRangeEditorDialog } from "./MappingRangeEditorDialog";
import { DmxMappingRange } from "app/persistentState";

describe("MappingRangeEditorDialog", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnSave.mockClear();
  });

  const renderDialog = (range: DmxMappingRange, isBoolean = false) => {
    return render(
      <MappingRangeEditorDialog
        isOpen={true}
        onClose={mockOnClose}
        range={range}
        onSave={mockOnSave}
        isBoolean={isBoolean}
      />,
    );
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

    it("displays boolean inputs when isBoolean is true", () => {
      const range: DmxMappingRange = {
        start: false,
        end: true,
        chunkValues: { type: "range", chunkStart: 0, chunkEnd: 255 },
      };

      renderDialog(range, true);

      // Boolean mode uses Select dropdowns instead of numeric inputs
      // Check that the dropdowns show the correct values
      const comboboxes = screen.getAllByRole("combobox");
      // First two comboboxes are for Start/End boolean values
      expect(comboboxes[0]).toHaveTextContent("false");
      expect(comboboxes[1]).toHaveTextContent("true");
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
          isBoolean={false}
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
  });
});

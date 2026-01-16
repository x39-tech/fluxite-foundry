import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SequenceStepEditor } from "./SequenceStepEditor";
import { DmxSequenceStep } from "app/persistentState";
import { validateSequenceSteps } from "./mappingUtils";

describe("SequenceStepEditor", () => {
  const mockOnStepsChange = vi.fn();

  beforeEach(() => {
    mockOnStepsChange.mockClear();
  });

  const renderEditor = (steps: DmxSequenceStep[]) => {
    const validation = validateSequenceSteps(steps);
    return render(
      <SequenceStepEditor
        steps={steps}
        onStepsChange={mockOnStepsChange}
        validation={validation}
      />,
    );
  };

  describe("empty state", () => {
    it("shows error message when no steps exist", () => {
      renderEditor([]);

      expect(
        screen.getByText("Sequence must have at least one step"),
      ).toBeInTheDocument();
    });

    it("shows Add Step button when no steps exist", () => {
      renderEditor([]);

      // The Add Step button uses a Tooltip, so we check for the button with the Plus icon
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe("adding and removing steps", () => {
    it("adds a step with default values when clicking Add Step", async () => {
      const user = userEvent.setup();
      renderEditor([]);

      // Click the only button which is the Add Step button
      const addButton = screen.getByRole("button");
      await user.click(addButton);

      expect(mockOnStepsChange).toHaveBeenCalledWith([
        { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ]);
    });

    it("adds a step to the end of existing steps", async () => {
      const user = userEvent.setup();
      const existingSteps: DmxSequenceStep[] = [
        { chunkStart: 10, chunkEnd: 50, hold: { milliseconds: 500 } },
      ];
      const { container } = renderEditor(existingSteps);

      // Find the Add Step button (it has the PlusCircleIcon)
      const addButton = container.querySelector(
        'button[data-slot="tooltip-trigger"]',
      );
      expect(addButton).toBeTruthy();
      await user.click(addButton!);

      expect(mockOnStepsChange).toHaveBeenCalledWith([
        { chunkStart: 10, chunkEnd: 50, hold: { milliseconds: 500 } },
        { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ]);
    });

    it("removes a step when clicking delete button", async () => {
      const user = userEvent.setup();
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      const { container } = renderEditor(steps);

      // Find the delete buttons inside the step cards (each card has border-border class)
      const stepCards = container.querySelectorAll(".border-border");
      expect(stepCards.length).toBe(2); // One card per step

      // Click the first card's delete button (last button in the card)
      const firstCardButtons = stepCards[0].querySelectorAll("button");
      const deleteButton = firstCardButtons[firstCardButtons.length - 1];
      await user.click(deleteButton);

      expect(mockOnStepsChange).toHaveBeenCalledWith([
        { chunkStart: 100, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ]);
    });
  });

  describe("indefinite hold display", () => {
    it("shows Duration selector for steps with finite hold", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      renderEditor(steps);

      const combobox = screen.getByRole("combobox");
      expect(combobox).toHaveTextContent("Duration");
      // Should show the milliseconds input
      expect(screen.getByDisplayValue("1000")).toBeInTheDocument();
    });

    it("shows Indefinite selector for steps with indefinite hold", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 255, hold: "indefinite" },
      ];
      renderEditor(steps);

      const combobox = screen.getByRole("combobox");
      expect(combobox).toHaveTextContent("Indefinite");
      // Should not show milliseconds input
      expect(screen.queryByDisplayValue("1000")).not.toBeInTheDocument();
    });
  });

  describe("warning display", () => {
    it("displays warning for indefinite hold on non-last step", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: "indefinite" },
        { chunkStart: 100, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      const { container } = renderEditor(steps);

      // The warning icon should be visible (ExclamationTriangleIcon with text-yellow-500 class)
      const warningIcons = container.querySelectorAll(".text-yellow-500");
      expect(warningIcons.length).toBe(1);
    });

    it("does not display warning for indefinite hold on last step", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 255, hold: "indefinite" },
      ];
      const { container } = renderEditor(steps);

      // No warning icons should be present in the entire component
      const warningIcons = container.querySelectorAll(".text-yellow-500");
      expect(warningIcons.length).toBe(0);
    });
  });

  describe("total duration display", () => {
    it("displays total duration for finite steps", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      renderEditor(steps);

      expect(screen.getByText("Total: 1.5s")).toBeInTheDocument();
    });

    it("displays indefinite for sequence with indefinite step", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 255, hold: "indefinite" },
      ];
      renderEditor(steps);

      expect(screen.getByText("Total: indefinite")).toBeInTheDocument();
    });

    it("displays 0ms for empty sequence", () => {
      renderEditor([]);

      expect(screen.getByText("Total: 0ms")).toBeInTheDocument();
    });
  });

  describe("step value editing", () => {
    it("calls onStepsChange when chunk start value changes", async () => {
      const user = userEvent.setup();
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      renderEditor(steps);

      // In the card layout, inputs are ordered: chunkStart, chunkEnd, holdMs
      const inputs = screen.getAllByRole("textbox");
      const chunkStartInput = inputs[0];

      // Type a single digit to trigger onStepsChange
      await user.type(chunkStartInput, "5");

      // Verify onStepsChange was called with a step that has updated chunkStart
      expect(mockOnStepsChange).toHaveBeenCalled();
      const lastCall =
        mockOnStepsChange.mock.calls[
          mockOnStepsChange.mock.calls.length - 1
        ][0];
      // The value will be "05" since we typed 5 after existing 0
      expect(lastCall[0].chunkStart).toBe(5);
    });

    it("calls onStepsChange when chunk end value changes", async () => {
      const user = userEvent.setup();
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      renderEditor(steps);

      // In the card layout, inputs are ordered: chunkStart, chunkEnd, holdMs
      const inputs = screen.getAllByRole("textbox");
      const chunkEndInput = inputs[1];

      // Type a single digit to trigger onStepsChange
      await user.type(chunkEndInput, "8");

      expect(mockOnStepsChange).toHaveBeenCalled();
      const lastCall =
        mockOnStepsChange.mock.calls[
          mockOnStepsChange.mock.calls.length - 1
        ][0];
      // The value will be "2558" since we typed 8 after existing 255
      expect(lastCall[0].chunkEnd).toBe(2558);
    });

    it("calls onStepsChange when hold milliseconds value changes", async () => {
      const user = userEvent.setup();
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      renderEditor(steps);

      // In the card layout, inputs are ordered: chunkStart, chunkEnd, holdMs
      const inputs = screen.getAllByRole("textbox");
      const holdInput = inputs[2];

      // Type a single digit to trigger onStepsChange
      await user.type(holdInput, "5");

      expect(mockOnStepsChange).toHaveBeenCalled();
      const lastCall =
        mockOnStepsChange.mock.calls[
          mockOnStepsChange.mock.calls.length - 1
        ][0];
      // The value will be "10005" since we typed 5 after existing 1000
      expect(lastCall[0].hold).toEqual({ milliseconds: 10005 });
    });
  });

  describe("card layout", () => {
    it("displays row labels", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
      ];
      renderEditor(steps);

      expect(screen.getByText("DMX:")).toBeInTheDocument();
      expect(screen.getByText("Hold:")).toBeInTheDocument();
    });

    it("renders correct number of step cards", () => {
      const steps: DmxSequenceStep[] = [
        { chunkStart: 0, chunkEnd: 100, hold: { milliseconds: 500 } },
        { chunkStart: 100, chunkEnd: 200, hold: { milliseconds: 500 } },
        { chunkStart: 200, chunkEnd: 255, hold: { milliseconds: 500 } },
      ];
      const { container } = renderEditor(steps);

      // Each step card has 3 textboxes (chunkStart, chunkEnd, holdMs)
      const inputs = screen.getAllByRole("textbox");
      expect(inputs).toHaveLength(9); // 3 steps × 3 inputs

      // Verify correct number of step cards (each has border-border class)
      const stepCards = container.querySelectorAll(".border-border");
      expect(stepCards.length).toBe(3);
    });
  });
});

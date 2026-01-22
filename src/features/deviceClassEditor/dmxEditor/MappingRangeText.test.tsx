import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { CodexId, DmxMappingRange } from "app/persistentState";
import { MappingRangeText } from "./MappingRangeText";
import { EffectiveEnumChoice } from "./mappingUtils";

describe("MappingRangeText", () => {
  const renderRangeText = (
    range: DmxMappingRange,
    enumChoices?: EffectiveEnumChoice[],
  ) => render(<MappingRangeText range={range} enumChoices={enumChoices} />);

  // Helper to create test enum choices
  const createEnumChoices = (names: string[]): EffectiveEnumChoice[] => {
    return names.map((name, index) => ({
      index,
      codexId: CodexId(`choice-${index}`),
      name: { value: name, locale: "en", desiredLocale: "en" },
    }));
  };

  describe("range mode", () => {
    it("displays numeric parameter range and DMX range", () => {
      renderRangeText({
        start: 0,
        end: 100,
        chunkValues: {
          type: "range",
          chunkStart: 0,
          chunkEnd: 255,
        },
      });

      expect(screen.getByText("0 → 100")).toBeInTheDocument();
      expect(screen.getByText("0 → 255")).toBeInTheDocument();
      expect(screen.getByText(/Parameter range/)).toBeInTheDocument();
      expect(screen.getByText(/maps to DMX range/)).toBeInTheDocument();
    });

    it("displays boolean parameter range", () => {
      renderRangeText({
        start: false,
        end: true,
        chunkValues: {
          type: "range",
          chunkStart: 0,
          chunkEnd: 255,
        },
      });

      expect(screen.getByText("false → true")).toBeInTheDocument();
    });

    it("displays null for undefined start", () => {
      renderRangeText({
        start: undefined,
        end: 100,
        chunkValues: {
          type: "range",
          chunkStart: 0,
          chunkEnd: 255,
        },
      });

      expect(screen.getByText("null → 100")).toBeInTheDocument();
    });

    it("displays only start when end is undefined", () => {
      renderRangeText({
        start: 50,
        end: undefined,
        chunkValues: {
          type: "range",
          chunkStart: 128,
          chunkEnd: 255,
        },
      });

      // When end is undefined, only start is shown (no arrow)
      expect(screen.getByText("50")).toBeInTheDocument();
      expect(screen.queryByText(/→ null/)).not.toBeInTheDocument();
    });

    it("displays both null values correctly", () => {
      renderRangeText({
        start: undefined,
        end: undefined,
        chunkValues: {
          type: "range",
          chunkStart: 0,
          chunkEnd: 255,
        },
      });

      // When end is undefined, only start is shown
      expect(screen.getByText("null")).toBeInTheDocument();
      expect(screen.queryByText(/→ null/)).not.toBeInTheDocument();
    });
  });

  describe("sequence mode", () => {
    it("displays singular step count for one step", () => {
      renderRangeText({
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
          ],
        },
      });

      expect(screen.getByText("1 step")).toBeInTheDocument();
      expect(screen.getByText(/triggers a sequence/)).toBeInTheDocument();
    });

    it("displays plural step count for multiple steps", () => {
      renderRangeText({
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 128, hold: { milliseconds: 500 } },
            { chunkStart: 128, chunkEnd: 255, hold: { milliseconds: 500 } },
            { chunkStart: 255, chunkEnd: 0, hold: { milliseconds: 500 } },
          ],
        },
      });

      expect(screen.getByText("3 steps")).toBeInTheDocument();
    });

    it("displays 0 steps for empty sequence", () => {
      renderRangeText({
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [],
        },
      });

      expect(screen.getByText("0 steps")).toBeInTheDocument();
    });

    it("displays duration in milliseconds for short durations", () => {
      renderRangeText({
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 500 } },
          ],
        },
      });

      expect(screen.getByText("length 500ms")).toBeInTheDocument();
    });

    it("displays duration in seconds for durations >= 1s", () => {
      renderRangeText({
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 128, hold: { milliseconds: 1000 } },
            { chunkStart: 128, chunkEnd: 255, hold: { milliseconds: 500 } },
          ],
        },
      });

      expect(screen.getByText("length 1.5s")).toBeInTheDocument();
    });

    it("displays duration in minutes for long durations", () => {
      renderRangeText({
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 60000 } },
            { chunkStart: 255, chunkEnd: 0, hold: { milliseconds: 30000 } },
          ],
        },
      });

      expect(screen.getByText("length 1m 30s")).toBeInTheDocument();
    });

    it("displays indefinite length for indefinite hold", () => {
      renderRangeText({
        start: 0,
        end: 100,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 128, hold: { milliseconds: 500 } },
            { chunkStart: 128, chunkEnd: 255, hold: "indefinite" },
          ],
        },
      });

      expect(screen.getByText("indefinite length")).toBeInTheDocument();
    });

    it("displays parameter range correctly in sequence mode", () => {
      renderRangeText({
        start: 10,
        end: 90,
        chunkValues: {
          type: "sequence",
          steps: [
            { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 1000 } },
          ],
        },
      });

      expect(screen.getByText("10 → 90")).toBeInTheDocument();
      expect(screen.getByText(/Parameter range/)).toBeInTheDocument();
    });

    it("displays boolean parameter range in sequence mode", () => {
      const { container } = renderRangeText({
        start: false,
        end: true,
        chunkValues: {
          type: "sequence",
          steps: [{ chunkStart: 255, chunkEnd: 255, hold: "indefinite" }],
        },
      });

      // Check the text content contains the boolean range
      expect(container.textContent).toContain("false → true");
    });

    it("displays single value when start and end are equal", () => {
      const { container } = renderRangeText({
        start: true,
        end: true,
        chunkValues: {
          type: "sequence",
          steps: [{ chunkStart: 255, chunkEnd: 255, hold: "indefinite" }],
        },
      });

      // When start === end, only the single value is shown (no arrow)
      expect(container.textContent).toContain("Parameter range true triggers");
      expect(container.textContent).not.toContain("→");
    });
  });

  describe("enum display", () => {
    it("displays enum choice names with indices", () => {
      const choices = createEnumChoices(["Square", "Sine", "Sawtooth"]);

      renderRangeText(
        {
          start: 0,
          end: 2,
          chunkValues: {
            type: "range",
            chunkStart: 0,
            chunkEnd: 255,
          },
        },
        choices,
      );

      expect(screen.getByText("Square (0) → Sawtooth (2)")).toBeInTheDocument();
    });

    it("displays single enum choice when start equals end", () => {
      const choices = createEnumChoices(["Open", "Closed"]);

      const { container } = renderRangeText(
        {
          start: 1,
          end: 1,
          chunkValues: {
            type: "range",
            chunkStart: 0,
            chunkEnd: 255,
          },
        },
        choices,
      );

      // Parameter range should show single value "Closed (1)" without an arrow
      // Note: The full text includes the DMX range which has an arrow
      expect(container.textContent).toContain("Closed (1)");
      // Verify it doesn't show "Closed (1) → Closed (1)" (a redundant range)
      expect(container.textContent).not.toContain("Closed (1) → Closed (1)");
    });

    it("displays Invalid for enum values not matching any choice", () => {
      const choices = createEnumChoices(["Square", "Sine"]);

      renderRangeText(
        {
          start: 5, // No choice with index 5
          end: 1,
          chunkValues: {
            type: "range",
            chunkStart: 0,
            chunkEnd: 255,
          },
        },
        choices,
      );

      expect(screen.getByText("Invalid: 5 → Sine (1)")).toBeInTheDocument();
    });

    it("displays enum choices in sequence mode", () => {
      const choices = createEnumChoices(["Off", "On"]);

      const { container } = renderRangeText(
        {
          start: 0,
          end: 1,
          chunkValues: {
            type: "sequence",
            steps: [
              { chunkStart: 0, chunkEnd: 255, hold: { milliseconds: 500 } },
            ],
          },
        },
        choices,
      );

      expect(container.textContent).toContain("Off (0) → On (1)");
      expect(container.textContent).toContain("triggers a sequence");
    });

    it("falls back to numeric display when no enum choices provided", () => {
      renderRangeText({
        start: 0,
        end: 2,
        chunkValues: {
          type: "range",
          chunkStart: 0,
          chunkEnd: 255,
        },
      });

      // Without enum choices, it should display raw numbers
      expect(screen.getByText("0 → 2")).toBeInTheDocument();
    });

    it("falls back to numeric display when enum choices is empty", () => {
      renderRangeText(
        {
          start: 0,
          end: 2,
          chunkValues: {
            type: "range",
            chunkStart: 0,
            chunkEnd: 255,
          },
        },
        [],
      );

      // With empty enum choices, it should display raw numbers
      expect(screen.getByText("0 → 2")).toBeInTheDocument();
    });
  });
});

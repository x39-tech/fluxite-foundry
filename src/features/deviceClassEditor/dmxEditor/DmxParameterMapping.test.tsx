import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  CodexId,
  DmxMapping,
  EntityId,
  fcDataTypes,
  LocalizationKey,
  LocalizationDbSchema,
  FCDataType,
} from "app/persistentState";
import { DmxParameterMapping } from "./DmxParameterMapping";
import { createDeviceClassEditor } from "features/topNavBar/state";
import { updateCurrentEditor } from "../state";
import { createNewParameter } from "../parametersEditor/state";

// Helper to create a test parameter class
function createTestParamClass(
  id: EntityId,
  codexId: CodexId,
  dataType: FCDataType,
  name: string,
) {
  updateCurrentEditor((editor) => {
    const locKey = LocalizationKey(`paramClass_${id}`);
    editor.localizations[locKey] = {
      strings: LocalizationDbSchema.parse({ "en-US": name }),
      items: [{ itemType: "paramClassName", itemId: id }],
    };
    editor.parameterClasses[id] = {
      codexId,
      dataType,
      localized: { name: locKey },
    };
  });
}

// Helper to create a test parameter
function createTestParameter(codexId: CodexId, classCodexId: CodexId) {
  createNewParameter(undefined, classCodexId, codexId, "", "en");
}

describe("DmxParameterMapping - Unmapped Parameter Table Rows", () => {
  const mockOnUpdate = vi.fn();
  const mockOnRemove = vi.fn();

  beforeEach(() => {
    createDeviceClassEditor();
    mockOnUpdate.mockClear();
    mockOnRemove.mockClear();
  });

  describe("Boolean unmapped parameter", () => {
    const BOOL_CLASS_ID = EntityId("bool-class");
    const BOOL_CLASS_CODEX_ID = CodexId("bool-class");
    const BOOL_PARAM_CODEX_ID = CodexId("bool-param");

    beforeEach(() => {
      createTestParamClass(
        BOOL_CLASS_ID,
        BOOL_CLASS_CODEX_ID,
        fcDataTypes.BOOLEAN,
        "Boolean Class",
      );
      createTestParameter(BOOL_PARAM_CODEX_ID, BOOL_CLASS_CODEX_ID);
    });

    it("displays start value in end field when end is undefined", () => {
      const mapping: DmxMapping = {
        mappedParam: { codexId: BOOL_PARAM_CODEX_ID },
        ranges: [],
        unmappedParams: [
          {
            parameter: { codexId: BOOL_PARAM_CODEX_ID },
            start: true,
            end: undefined,
          },
        ],
      };

      render(
        <DmxParameterMapping
          mapping={mapping}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />,
      );

      // Both start and end selects should show the same value
      const selects = screen.getAllByRole("combobox");
      // Find the start and end selects (they show "true" or "false")
      const boolSelects = selects.filter(
        (s) =>
          s.textContent?.includes("true") || s.textContent?.includes("false"),
      );
      expect(boolSelects.length).toBeGreaterThanOrEqual(2);
      // Both should show "true"
      expect(boolSelects[0]).toHaveTextContent("true");
      expect(boolSelects[1]).toHaveTextContent("true");
    });

    it("stores end as undefined when user selects same value as start", async () => {
      const user = userEvent.setup();
      const mapping: DmxMapping = {
        mappedParam: { codexId: BOOL_PARAM_CODEX_ID },
        ranges: [],
        unmappedParams: [
          {
            parameter: { codexId: BOOL_PARAM_CODEX_ID },
            start: false,
            end: true,
          },
        ],
      };

      render(
        <DmxParameterMapping
          mapping={mapping}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />,
      );

      // Find the end select (second boolean select) and change it to match start
      const selects = screen.getAllByRole("combobox");
      const boolSelects = selects.filter(
        (s) =>
          s.textContent?.includes("true") || s.textContent?.includes("false"),
      );
      // The second one is the end select
      await user.click(boolSelects[1]);
      await user.click(screen.getByRole("option", { name: "false" }));

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedMapping = mockOnUpdate.mock.calls[0][0] as DmxMapping;
      expect(updatedMapping.unmappedParams?.[0].end).toBe(undefined);
    });
  });

  describe("Numeric unmapped parameter", () => {
    const NUM_CLASS_ID = EntityId("num-class");
    const NUM_CLASS_CODEX_ID = CodexId("num-class");
    const NUM_PARAM_CODEX_ID = CodexId("num-param");

    beforeEach(() => {
      createTestParamClass(
        NUM_CLASS_ID,
        NUM_CLASS_CODEX_ID,
        fcDataTypes.NUMBER,
        "Numeric Class",
      );
      createTestParameter(NUM_PARAM_CODEX_ID, NUM_CLASS_CODEX_ID);
    });

    it("displays start value in end field when end is undefined", () => {
      const mapping: DmxMapping = {
        mappedParam: { codexId: NUM_PARAM_CODEX_ID },
        ranges: [],
        unmappedParams: [
          {
            parameter: { codexId: NUM_PARAM_CODEX_ID },
            start: 42,
            end: undefined,
          },
        ],
      };

      render(
        <DmxParameterMapping
          mapping={mapping}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />,
      );

      // Find text inputs for start and end
      const inputs = screen.getAllByRole("textbox");
      // Should have at least 2 text inputs for start and end
      expect(inputs.length).toBeGreaterThanOrEqual(2);
      // Both should show "42"
      expect(inputs[0]).toHaveValue("42");
      expect(inputs[1]).toHaveValue("42");
    });

    it("stores end as undefined when user enters same value as start", () => {
      const mapping: DmxMapping = {
        mappedParam: { codexId: NUM_PARAM_CODEX_ID },
        ranges: [],
        unmappedParams: [
          {
            parameter: { codexId: NUM_PARAM_CODEX_ID },
            start: 10,
            end: 100,
          },
        ],
      };

      render(
        <DmxParameterMapping
          mapping={mapping}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />,
      );

      // Find the end input (second text input) and change it to match start
      const inputs = screen.getAllByRole("textbox");
      fireEvent.change(inputs[1], { target: { value: "10" } });
      // ConfirmableInput only triggers onConfirm on blur or Enter key
      fireEvent.blur(inputs[1]);

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedMapping = mockOnUpdate.mock.calls[0][0] as DmxMapping;
      expect(updatedMapping.unmappedParams?.[0].end).toBe(undefined);
    });
  });

  describe("Enum unmapped parameter", () => {
    const ENUM_CLASS_ID = EntityId("enum-class");
    const ENUM_CLASS_CODEX_ID = CodexId("enum-class");
    const ENUM_PARAM_CODEX_ID = CodexId("enum-param");

    beforeEach(() => {
      // Create enum parameter class with choices
      updateCurrentEditor((editor) => {
        const classNameKey = LocalizationKey("enum_class_name");
        editor.localizations[classNameKey] = {
          strings: LocalizationDbSchema.parse({ "en-US": "Enum Class" }),
          items: [{ itemType: "paramClassName", itemId: ENUM_CLASS_ID }],
        };

        editor.parameterClasses[ENUM_CLASS_ID] = {
          codexId: ENUM_CLASS_CODEX_ID,
          dataType: fcDataTypes.ENUM,
          localized: { name: classNameKey },
        };

        // Add enum choices
        const choice0Key = LocalizationKey("choice0_name");
        const choice1Key = LocalizationKey("choice1_name");
        const choice2Key = LocalizationKey("choice2_name");

        editor.localizations[choice0Key] = {
          strings: LocalizationDbSchema.parse({ "en-US": "Choice A" }),
          items: [],
        };
        editor.localizations[choice1Key] = {
          strings: LocalizationDbSchema.parse({ "en-US": "Choice B" }),
          items: [],
        };
        editor.localizations[choice2Key] = {
          strings: LocalizationDbSchema.parse({ "en-US": "Choice C" }),
          items: [],
        };

        editor.enumChoices[EntityId("choice0")] = {
          parent: { type: "paramClass", id: ENUM_CLASS_ID },
          codexId: CodexId("choice0"),
          index: 0,
          localized: { name: choice0Key },
        };
        editor.enumChoices[EntityId("choice1")] = {
          parent: { type: "paramClass", id: ENUM_CLASS_ID },
          codexId: CodexId("choice1"),
          index: 1,
          localized: { name: choice1Key },
        };
        editor.enumChoices[EntityId("choice2")] = {
          parent: { type: "paramClass", id: ENUM_CLASS_ID },
          codexId: CodexId("choice2"),
          index: 2,
          localized: { name: choice2Key },
        };
      });

      createTestParameter(ENUM_PARAM_CODEX_ID, ENUM_CLASS_CODEX_ID);
    });

    it("displays start value in end field when end is undefined", () => {
      const mapping: DmxMapping = {
        mappedParam: { codexId: ENUM_PARAM_CODEX_ID },
        ranges: [],
        unmappedParams: [
          {
            parameter: { codexId: ENUM_PARAM_CODEX_ID },
            start: 1, // Choice B
            end: undefined,
          },
        ],
      };

      render(
        <DmxParameterMapping
          mapping={mapping}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />,
      );

      // Find enum selects (they show choice names with indices like "Choice B (1)")
      const selects = screen.getAllByRole("combobox");
      const enumSelects = selects.filter((s) =>
        s.textContent?.includes("Choice"),
      );
      expect(enumSelects.length).toBeGreaterThanOrEqual(2);
      // Both should show "Choice B (1)"
      expect(enumSelects[0]).toHaveTextContent("Choice B (1)");
      expect(enumSelects[1]).toHaveTextContent("Choice B (1)");
    });

    it("stores end as undefined when user selects same value as start", async () => {
      const user = userEvent.setup();
      const mapping: DmxMapping = {
        mappedParam: { codexId: ENUM_PARAM_CODEX_ID },
        ranges: [],
        unmappedParams: [
          {
            parameter: { codexId: ENUM_PARAM_CODEX_ID },
            start: 0, // Choice A
            end: 2, // Choice C
          },
        ],
      };

      render(
        <DmxParameterMapping
          mapping={mapping}
          onUpdate={mockOnUpdate}
          onRemove={mockOnRemove}
        />,
      );

      // Find enum selects
      const selects = screen.getAllByRole("combobox");
      const enumSelects = selects.filter((s) =>
        s.textContent?.includes("Choice"),
      );
      // The second one is the end select
      await user.click(enumSelects[1]);
      await user.click(screen.getByRole("option", { name: "Choice A (0)" }));

      expect(mockOnUpdate).toHaveBeenCalled();
      const updatedMapping = mockOnUpdate.mock.calls[0][0] as DmxMapping;
      expect(updatedMapping.unmappedParams?.[0].end).toBe(undefined);
    });
  });
});

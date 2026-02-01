import { render, screen, within, waitFor } from "@testing-library/react";
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

function getHookValue<T>(hook: () => T): T {
  const { result } = renderHook(hook);
  return result.current;
}

async function expandParameter(parameterName: string) {
  const user = userEvent.setup();
  const expandButton = screen.getByRole("button", {
    name: `Expand ${parameterName}`,
  });
  await user.click(expandButton);
}

function createParameter(
  library: string | undefined,
  paramClass: CodexId,
  codexId: CodexId,
): EntityId {
  createNewParameter(library, paramClass, codexId);
  const params = getHookValue(useParameters);
  const paramEntry = Object.entries(params || {}).find(
    ([_, param]) => param.codexId === codexId,
  );
  if (!paramEntry) {
    throw new Error(`Parameter with codexId ${codexId} not found`);
  }
  return EntityId(paramEntry[0]);
}

function getInputByLabel(label: string) {
  const row = screen.getByText(label).closest("tr")!;
  return within(row).getByRole("textbox");
}

async function setInputValue(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) {
  const input = getInputByLabel(label);
  await user.click(input);
  await user.keyboard(`{Control>}a{/Control}${value}`);
}

async function setInputValueAndBlur(
  user: ReturnType<typeof userEvent.setup>,
  label: string,
  value: string,
) {
  await setInputValue(user, label, value);
  // Tab away to trigger blur and onValueCommit
  await user.tab();
}

beforeEach(() => {
  createDeviceClassEditor();
});

describe("InstantiationProperties - Dynamic Mode", () => {
  async function setupDynamicParameter() {
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

    const paramId = createParameter(
      undefined,
      CodexId("TestClass"),
      CodexId("test-param"),
    );

    render(<ParameterEditor paramId={paramId} />);
    await expandParameter("test-param");

    // Change to Dynamic mode
    const instancesRow = screen.getByText("Instances").closest("tr")!;
    const instancesSelect = within(instancesRow).getByRole("combobox");
    await user.click(instancesSelect);
    const dynamicOption = screen.getByRole("option", { name: "Dynamic" });
    await user.click(dynamicOption);

    // Wait for Dynamic mode to be active
    await waitFor(() => {
      expect(screen.getByText("Minimum Instance Count")).toBeInTheDocument();
    });

    return user;
  }

  test("setting minimum below maximum does not affect maximum", async () => {
    const user = await setupDynamicParameter();

    // Set maximum to 10 and blur
    await setInputValueAndBlur(user, "Maximum Instance Count", "10");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("10");

    // Set minimum to 5 (below maximum) and blur
    await setInputValueAndBlur(user, "Minimum Instance Count", "5");

    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("5");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("10");
  });

  test("setting minimum above maximum adjusts maximum to match", async () => {
    const user = await setupDynamicParameter();

    // Set maximum to 5 and blur
    await setInputValueAndBlur(user, "Maximum Instance Count", "5");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("5");

    // Set minimum to 10 (above maximum) and blur - should adjust max
    await setInputValueAndBlur(user, "Minimum Instance Count", "10");

    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("10");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("10");
  });

  test("setting maximum above minimum does not affect minimum", async () => {
    const user = await setupDynamicParameter();

    // Set minimum to 5 and blur
    await setInputValueAndBlur(user, "Minimum Instance Count", "5");
    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("5");

    // Set maximum to 10 (above minimum) and blur
    await setInputValueAndBlur(user, "Maximum Instance Count", "10");

    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("5");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("10");
  });

  test("setting maximum below minimum adjusts minimum to match", async () => {
    const user = await setupDynamicParameter();

    // Set minimum to 10 and blur
    await setInputValueAndBlur(user, "Minimum Instance Count", "10");
    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("10");

    // Set maximum to 5 (below minimum) and blur - should adjust min
    await setInputValueAndBlur(user, "Maximum Instance Count", "5");

    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("5");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("5");
  });

  test("clearing maximum does not affect minimum", async () => {
    const user = await setupDynamicParameter();

    // Set minimum to 5 and blur
    await setInputValueAndBlur(user, "Minimum Instance Count", "5");
    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("5");

    // Set maximum to 10 and blur
    await setInputValueAndBlur(user, "Maximum Instance Count", "10");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("10");

    // Clear maximum using the clear button
    const maxRow = screen.getByText("Maximum Instance Count").closest("tr")!;
    const clearButton = within(maxRow).getByRole("button", {
      name: "Clear value",
    });
    await user.click(clearButton);

    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("5");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("");
  });

  test("incrementing minimum above maximum adjusts maximum via button", async () => {
    const user = await setupDynamicParameter();

    // Set maximum to 3 and blur
    await setInputValueAndBlur(user, "Maximum Instance Count", "3");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("3");

    // Initial minimum is 1, click increment button 3 times to get to 4
    const minRow = screen.getByText("Minimum Instance Count").closest("tr")!;
    const incrementButton = within(minRow).getByRole("button", {
      name: "Increment",
    });

    // Click increment 3 times: 1 -> 2 -> 3 -> 4
    await user.click(incrementButton);
    await user.click(incrementButton);
    await user.click(incrementButton);

    // Min is now 4, which exceeds max of 3, so max should adjust to 4
    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("4");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("4");
  });

  test("decrementing maximum below minimum adjusts minimum via button", async () => {
    const user = await setupDynamicParameter();

    // Set minimum to 5 and blur
    await setInputValueAndBlur(user, "Minimum Instance Count", "5");
    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("5");

    // Set maximum to 7 and blur
    await setInputValueAndBlur(user, "Maximum Instance Count", "7");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("7");

    // Click decrement button 3 times: 7 -> 6 -> 5 -> 4
    const maxRow = screen.getByText("Maximum Instance Count").closest("tr")!;
    const decrementButton = within(maxRow).getByRole("button", {
      name: "Decrement",
    });

    await user.click(decrementButton);
    await user.click(decrementButton);
    await user.click(decrementButton);

    // Max is now 4, which is below min of 5, so min should adjust to 4
    expect(getInputByLabel("Minimum Instance Count")).toHaveValue("4");
    expect(getInputByLabel("Maximum Instance Count")).toHaveValue("4");
  });
});
